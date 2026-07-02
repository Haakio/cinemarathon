import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import { patchnoteHistory } from '../lib/patchnotes'

/**
 * Couche sociale : profil (avatar), amis, notifications.
 *
 * Coût Neon minimal : profil + amis sont chargés UNE fois par session
 * (pas de polling). Les notifications sont dérivées côté client :
 * patchnotes (statiques) + demandes d'amis reçues. Le "non lu" est
 * suivi en localStorage.
 */

function getNotifSeenAt(userId) {
  return typeof window !== 'undefined' ? localStorage.getItem(`cm_notif_seen_${userId}`) : null
}

export function useSocial({ authed, currentUser, onError }) {
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [avatarMap, setAvatarMap] = useState({})
  const [notifSeenAt, setNotifSeenAt] = useState(null)

  const loadSocial = useCallback(async () => {
    if (!authed) return
    try {
      const [me, friendData, avatarData] = await Promise.all([
        api('GET', '/auth/profile'),
        api('GET', '/auth/friends'),
        api('GET', '/auth/avatars'),
      ])
      setProfile(me)
      setFriends(friendData.friends || [])
      setIncoming(friendData.incoming || [])
      setOutgoing(friendData.outgoing || [])
      // Map de lookup : par userId ET par pseudo (les données du marathon
      // ne portent parfois que le pseudo)
      const map = {}
      ;(avatarData.avatars || []).forEach(a => {
        map[a.userId] = a
        map[(a.pseudo || '').toLowerCase()] = a
      })
      setAvatarMap(map)
    } catch { }
  }, [authed])

  // Chargement unique par session
  useEffect(() => { loadSocial() }, [loadSocial])

  useEffect(() => {
    if (currentUser?.id) setNotifSeenAt(getNotifSeenAt(currentUser.id))
  }, [currentUser])

  // ── Avatar ──────────────────────────────────────────────
  const updateAvatar = useCallback(async (avatarEmoji, avatarHue, avatarUrl = '') => {
    try {
      await api('POST', '/auth/profile', { avatarEmoji, avatarHue, avatarUrl })
      setProfile(prev => ({ ...(prev || {}), avatarEmoji, avatarHue, avatarUrl }))
      // Mise à jour immédiate du map partagé (membres, classement...)
      if (currentUser) {
        const entry = { userId: currentUser.id, pseudo: currentUser.pseudo, emoji: avatarEmoji, hue: avatarHue, url: avatarUrl }
        setAvatarMap(prev => ({
          ...prev,
          [currentUser.id]: entry,
          [(currentUser.pseudo || '').toLowerCase()]: entry,
        }))
      }
      return true
    } catch (e) {
      onError?.('Profil: ' + e.message)
      return false
    }
  }, [onError, currentUser])

  // ── Amis ────────────────────────────────────────────────
  const sendFriendRequest = useCallback(async pseudo => {
    try {
      const data = await api('POST', '/auth/friends', { action: 'request', pseudo })
      await loadSocial() // re-synchronise les 3 listes (1 requête)
      return data.accepted ? 'accepted' : 'sent'
    } catch (e) {
      onError?.(e.message)
      return null
    }
  }, [loadSocial, onError])

  const acceptFriend = useCallback(async userId => {
    try {
      await api('POST', '/auth/friends', { action: 'accept', targetUserId: userId })
      const entry = incoming.find(r => r.userId === userId)
      setIncoming(prev => prev.filter(r => r.userId !== userId))
      if (entry) setFriends(prev => [...prev, entry])
    } catch (e) { onError?.(e.message) }
  }, [incoming, onError])

  const declineFriend = useCallback(async userId => {
    try {
      await api('POST', '/auth/friends', { action: 'decline', targetUserId: userId })
      setIncoming(prev => prev.filter(r => r.userId !== userId))
      setOutgoing(prev => prev.filter(r => r.userId !== userId))
    } catch (e) { onError?.(e.message) }
  }, [onError])

  const removeFriend = useCallback(async userId => {
    try {
      await api('POST', '/auth/friends', { action: 'remove', targetUserId: userId })
      setFriends(prev => prev.filter(r => r.userId !== userId))
    } catch (e) { onError?.(e.message) }
  }, [onError])

  const searchMembers = useCallback(async query => {
    try {
      const data = await api('GET', `/auth/profile?search=${encodeURIComponent(query)}`)
      return data.results || []
    } catch { return [] }
  }, [])

  // ── Notifications ───────────────────────────────────────
  const unreadPatchnotes = useMemo(() => {
    if (!notifSeenAt) return patchnoteHistory.length
    return patchnoteHistory.filter(entry => entry.date > notifSeenAt.slice(0, 10)).length
  }, [notifSeenAt])

  // Les demandes d'amis comptent tant qu'elles ne sont pas traitées
  const unreadCount = unreadPatchnotes + incoming.length

  const markNotificationsSeen = useCallback(() => {
    if (!currentUser?.id) return
    const now = new Date().toISOString()
    localStorage.setItem(`cm_notif_seen_${currentUser.id}`, now)
    setNotifSeenAt(now)
  }, [currentUser])

  return {
    profile, friends, incoming, outgoing, avatarMap,
    updateAvatar, sendFriendRequest, acceptFriend, declineFriend, removeFriend, searchMembers,
    unreadCount, unreadPatchnotes, notifSeenAt, markNotificationsSeen,
    reload: loadSocial,
  }
}

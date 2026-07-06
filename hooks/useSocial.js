import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

export function useSocial({ authed, currentUser, pageVisible = true, onNotify, onUrgent, onError, onSessionInvalid }) {
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [avatarMap, setAvatarMap] = useState({})
  const [roomInvites, setRoomInvites] = useState([])
  const [modCases, setModCases] = useState([]) // dossiers de modération (admin site)
  const [notifSeenAt, setNotifSeenAt] = useState(null)
  const isSiteAdmin = Boolean(currentUser?.pseudo) && currentUser.pseudo === process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  // Instantané précédent pour détecter les nouveautés (popups)
  const prevSnapshotRef = useRef(null)

  const loadSocial = useCallback(async () => {
    if (!authed) return
    try {
      const [me, friendData, avatarData] = await Promise.all([
        api('GET', '/auth/profile'),
        api('GET', '/auth/friends'),
        api('GET', '/auth/avatars'),
      ])
      const nextFriends = friendData.friends || []
      const nextIncoming = friendData.incoming || []
      const nextOutgoing = friendData.outgoing || []
      const nextInvites = friendData.roomInvites || []

      // Détection des événements depuis le dernier chargement → popups
      const prev = prevSnapshotRef.current
      if (prev && onNotify) {
        nextIncoming
          .filter(request => !prev.incomingIds.has(request.userId))
          .forEach(request => onNotify({
            icon: '👥',
            title: "Demande d'ami",
            text: `${request.pseudo} veut devenir votre ami`,
            tab: 'amis', // clic → directement l'onglet Amis (accepter/refuser)
          }))
        nextInvites
          .filter(invite => !prev.inviteIds.has(invite.roomId))
          .forEach(invite => onNotify({
            icon: '🎬',
            title: 'Invitation',
            text: `${invite.fromPseudo} vous invite dans ${invite.roomName}`,
            tab: 'notifications', // clic → l'onglet où sont Rejoindre/Refuser
          }))
        nextFriends
          .filter(friend => prev.outgoingIds.has(friend.userId) && !prev.friendIds.has(friend.userId))
          .forEach(friend => onNotify({
            icon: '🎉',
            title: 'Nouvel ami',
            text: `${friend.pseudo} a accepté votre demande d'ami`,
            tab: 'amis',
          }))
      }
      prevSnapshotRef.current = {
        incomingIds: new Set(nextIncoming.map(r => r.userId)),
        inviteIds: new Set(nextInvites.map(i => i.roomId)),
        outgoingIds: new Set(nextOutgoing.map(r => r.userId)),
        friendIds: new Set(nextFriends.map(f => f.userId)),
      }

      setProfile(me)
      setFriends(nextFriends)
      setIncoming(nextIncoming)
      setOutgoing(nextOutgoing)
      setRoomInvites(nextInvites)
      // Map de lookup : par userId ET par pseudo (les données du marathon
      // ne portent parfois que le pseudo)
      const map = {}
      ;(avatarData.avatars || []).forEach(a => {
        map[a.userId] = a
        map[(a.pseudo || '').toLowerCase()] = a
      })
      setAvatarMap(map)

      // Staff (admin + modérateurs) : dossiers de modération, avec ALERTE
      // URGENTE si un nouveau blocage est apparu depuis le dernier chargement.
      if (isSiteAdmin || me.moderator) {
        try {
          const mod = await api('GET', '/auth/moderation')
          const cases = mod.cases || []
          // Nouveau blocage → GRANDE alerte (plein écran + son), pas une
          // petite popup : c'est un événement grave.
          const prevIds = prevSnapshotRef.current?.modIds
          if (prevIds && onUrgent) {
            cases
              .filter(c => !c.banned && !prevIds.has(c.userId))
              .forEach(c => onUrgent(c))
          }
          prevSnapshotRef.current = { ...(prevSnapshotRef.current || {}), modIds: new Set(cases.map(c => c.userId)) }
          setModCases(cases)
        } catch { }
      }
    } catch (err) {
      // Session fantôme : le token est encore signé mais le compte n'existe
      // plus (supprimé) → déconnexion forcée.
      if (err?.status === 404) onSessionInvalid?.()
    }
  }, [authed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement au login + resynchronisation au retour d'onglet
  useEffect(() => {
    if (authed && pageVisible) loadSocial()
  }, [authed, pageVisible, loadSocial])

  // Poll social léger (60s, onglet visible) : les demandes d'amis,
  // acceptations et invitations arrivent en popup sans refresh.
  useEffect(() => {
    if (!authed || !pageVisible) return
    const timer = setInterval(loadSocial, 60000)
    return () => clearInterval(timer)
  }, [authed, pageVisible, loadSocial])

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

  // Actions de modération (admin site) : débloquer / bannir / débannir
  const moderateCase = useCallback(async (action, userId, banIp = false) => {
    try {
      await api('POST', '/auth/moderation', { action, userId, banIp })
      setModCases(prev => action === 'ban'
        ? prev.map(c => c.userId === userId ? { ...c, banned: true } : c)
        : prev.filter(c => c.userId !== userId))
      return true
    } catch (e) {
      onError?.(e.message)
      return false
    }
  }, [onError])

  // Pastille avatar : demandes d'amis + invitations + patchnotes.
  // Les dossiers de modération ont LEUR compteur sur l'entrée Bannissement.
  const pendingModCount = modCases.filter(c => !c.banned).length
  const unreadCount = unreadPatchnotes + incoming.length + roomInvites.length

  const removeRoomInvite = useCallback(roomId => {
    setRoomInvites(prev => prev.filter(invite => invite.roomId !== roomId))
  }, [])

  const markNotificationsSeen = useCallback(() => {
    if (!currentUser?.id) return
    const now = new Date().toISOString()
    localStorage.setItem(`cm_notif_seen_${currentUser.id}`, now)
    setNotifSeenAt(now)
  }, [currentUser])

  return {
    profile, friends, incoming, outgoing, avatarMap, roomInvites, removeRoomInvite,
    modCases, moderateCase, pendingModCount,
    updateAvatar, sendFriendRequest, acceptFriend, declineFriend, removeFriend, searchMembers,
    unreadCount, unreadPatchnotes, notifSeenAt, markNotificationsSeen,
    reload: loadSocial,
  }
}

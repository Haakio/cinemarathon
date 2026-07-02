import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api'

/**
 * Vote de séance de la room.
 * Coût Neon : 1 requête au changement de room + rechargement automatique
 * à l'échéance (setTimeout local, pas de polling). La clôture est "lazy" :
 * c'est le GET qui déclenche le calcul du gagnant côté serveur.
 */
export function useVote({ authed, currentRoomId, currentUser, onError }) {
  const [vote, setVote] = useState(null)
  const [ballots, setBallots] = useState([])

  const loadVote = useCallback(async () => {
    if (!authed || !currentRoomId) return
    try {
      const data = await api('GET', `/auth/vote?roomId=${encodeURIComponent(currentRoomId)}`)
      setVote(data.vote)
      setBallots(data.ballots || [])
    } catch { }
  }, [authed, currentRoomId])

  // Chargé au login / changement de room (sert aussi à la pastille de notif)
  useEffect(() => { loadVote() }, [loadVote])

  // À l'échéance d'un vote ouvert : un seul rechargement (déclenche la
  // clôture serveur), programmé localement — aucun polling.
  useEffect(() => {
    if (!vote || vote.status !== 'open') return
    const ms = new Date(vote.ends_at).getTime() - Date.now()
    if (ms <= 0) { loadVote(); return }
    const timer = setTimeout(loadVote, ms + 1500)
    return () => clearTimeout(timer)
  }, [vote, loadVote])

  const castBallot = useCallback(async itemId => {
    if (!vote) return
    try {
      await api('POST', '/auth/vote', { action: 'ballot', roomId: currentRoomId, voteId: vote.id, itemId })
      // Mise à jour optimiste du bulletin local
      setBallots(prev => {
        const others = prev.filter(b => b.user_id !== currentUser?.id)
        return [...others, { vote_id: vote.id, user_id: currentUser?.id, pseudo: currentUser?.pseudo, item_id: itemId, updated_at: new Date().toISOString() }]
      })
    } catch (e) {
      onError?.(e.message)
      loadVote()
    }
  }, [vote, currentRoomId, currentUser, onError, loadVote])

  const createVote = useCallback(async (itemIds, endsAt) => {
    try {
      await api('POST', '/auth/vote', { action: 'create', roomId: currentRoomId, itemIds, endsAt })
      await loadVote()
      return true
    } catch (e) {
      onError?.(e.message)
      return false
    }
  }, [currentRoomId, onError, loadVote])

  const cancelActiveVote = useCallback(async () => {
    if (!vote) return
    try {
      await api('POST', '/auth/vote', { action: 'cancel', roomId: currentRoomId, voteId: vote.id })
      setVote(null)
      setBallots([])
    } catch (e) { onError?.(e.message) }
  }, [vote, currentRoomId, onError])

  const myBallot = ballots.find(b => b.user_id === currentUser?.id) || null
  const voteOpen = Boolean(vote && vote.status === 'open')

  return { vote, ballots, myBallot, voteOpen, castBallot, createVote, cancelActiveVote, loadVote }
}

import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api'
import { VIEWS } from '../utils/constants'

/**
 * Vote de séance de la room.
 * Coût Neon maîtrisé :
 * - poll lent 45s (onglet visible) → la cloche apparaît sans refresh
 * - poll rapide 4s UNIQUEMENT sur la page Vote avec un vote ouvert
 *   → résultats quasi temps réel pendant qu'on les regarde
 * - clôture "lazy" : le GET calcule le gagnant côté serveur à l'échéance
 */
export function useVote({ authed, currentRoomId, currentUser, view, pageVisible, onError }) {
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

  // Chargé au login, au changement de room, ET au retour sur l'onglet :
  // quelqu'un qui revient d'AFK voit immédiatement la cloche si un vote
  // a été lancé pendant son absence. Zéro polling en dehors de la page Vote.
  useEffect(() => {
    if (authed && pageVisible) loadVote()
  }, [authed, pageVisible, loadVote])

  // Poll rapide 4s, seulement sur la page Vote quand il se passe quelque
  // chose : vote ouvert (résultats live) OU égalité en attente du verdict
  // de Jimmy (pour que la révélation de l'admin arrive chez tout le monde).
  const awaitingJimmy = (() => {
    if (!vote || vote.status !== 'closed' || !vote.tie_break) return false
    try { return !JSON.parse(vote.tie_break).revealed } catch { return false }
  })()

  useEffect(() => {
    if (!authed || !pageVisible || view !== VIEWS.VOTE) return
    if (!vote || (vote.status !== 'open' && !awaitingJimmy)) return
    const timer = setInterval(loadVote, 4000)
    return () => clearInterval(timer)
  }, [authed, pageVisible, view, vote, awaitingJimmy, loadVote])

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

  const revealJimmy = useCallback(async () => {
    try {
      await api('POST', '/auth/vote', { action: 'reveal', roomId: currentRoomId })
      // Mise à jour optimiste : le verdict devient visible immédiatement
      setVote(prev => {
        if (!prev?.tie_break) return prev
        try {
          const tieBreak = JSON.parse(prev.tie_break)
          return { ...prev, tie_break: JSON.stringify({ ...tieBreak, revealed: true }) }
        } catch { return prev }
      })
    } catch (e) { onError?.(e.message) }
  }, [currentRoomId, onError])

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

  return { vote, ballots, myBallot, voteOpen, castBallot, createVote, cancelActiveVote, revealJimmy, loadVote }
}

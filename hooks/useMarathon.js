import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getStoredRoom, saveStoredRoom } from '../utils/api'
import { VIEWS } from '../utils/constants'

/**
 * Données du marathon : rooms, watchlist, avis, dispos, membres.
 *
 * Stratégie coût Neon (identique à l'existant) :
 * - rooms : poll 8s, suspendu sur les vues immersives et onglet caché
 * - watchlist + watched : chargées ensemble, rechargées au changement de vue/room
 * - availability : poll 10s uniquement sur la vue calendrier
 * - membres : chargés uniquement quand le panneau room / la vue admin le demande
 * Toutes les autres données (stats, classement, activité...) sont DÉRIVÉES
 * de ces états côté client, sans requête supplémentaire.
 *
 * @param {{authed: boolean, currentUser: object|null, view: string, pageVisible: boolean, membersWanted: boolean}} params
 */
export function useMarathon({ authed, currentUser, view, pageVisible, membersWanted }) {
  const [rooms, setRooms] = useState([])
  const [currentRoomId, setCurrentRoomId] = useState('marvel')
  const [watchlist, setWatchlist] = useState([])
  const [watched, setWatched] = useState([])
  const [availability, setAvailability] = useState([])
  const [roomMembers, setRoomMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const lastDataLoadRef = useRef(0)

  const isAdmin = currentUser?.pseudo === process.env.NEXT_PUBLIC_ADMIN_PSEUDO

  // Restauration de la room choisie
  useEffect(() => { setCurrentRoomId(getStoredRoom()) }, [])

  const loadRooms = useCallback(async () => {
    if (!authed) return
    try {
      const data = await api('GET', '/auth/rooms')
      setRooms(data)
      if (data.length && !data.some(room => room.id === currentRoomId)) {
        setCurrentRoomId(data[0].id)
        saveStoredRoom(data[0].id)
      }
    } catch { }
  }, [authed, currentRoomId])

  const loadData = useCallback(async () => {
    if (!authed || !currentRoomId) return
    lastDataLoadRef.current = Date.now()
    setLoading(true)
    try {
      const roomQuery = `roomId=${encodeURIComponent(currentRoomId)}`
      const [wl, wd] = await Promise.all([
        api('GET', `/auth/watchlist?${roomQuery}`),
        api('GET', `/auth/watchlist/watched?${roomQuery}`),
      ])
      setWatchlist(wl)
      setWatched(wd)
    } catch { }
    setLoading(false)
  }, [authed, currentRoomId])

  const loadAvailability = useCallback(async () => {
    if (!authed || !currentRoomId) return
    try {
      const roomQuery = `roomId=${encodeURIComponent(currentRoomId)}`
      const entries = await api('GET', `/auth/availability?${roomQuery}`)
      setAvailability(entries)
    } catch { }
  }, [authed, currentRoomId])

  // Chargements initiaux
  useEffect(() => { if (authed) loadRooms() }, [authed, loadRooms])
  useEffect(() => { if (authed) loadData() }, [authed, loadData])
  useEffect(() => { if (authed) loadAvailability() }, [authed, loadAvailability])

  // Poll rooms : 45s suffit largement (la liste des rooms change rarement,
  // et les actions créer/rejoindre la mettent à jour immédiatement).
  // Ancien intervalle : 8s → ~450 req/h par utilisateur idle. Nouveau : ~80.
  useEffect(() => {
    if (!authed || !pageVisible || view === VIEWS.REGARDER || view === VIEWS.VU) return
    const timer = setInterval(loadRooms, 45000)
    return () => clearInterval(timer)
  }, [authed, pageVisible, view, loadRooms])

  // Rechargement au changement de vue, throttlé à 20s : naviguer entre
  // 5 vues en 10 secondes ne déclenche plus 5×2 requêtes SQL identiques.
  // Les actions (noter, ajouter...) appellent loadData() directement et
  // restent donc instantanées.
  useEffect(() => {
    if (!authed) return
    if (Date.now() - lastDataLoadRef.current > 20000) loadData()
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dispos : poll 10s uniquement sur le calendrier
  useEffect(() => {
    if (!authed || view !== VIEWS.CALENDRIER) return
    loadAvailability()
    const timer = setInterval(loadAvailability, 10000)
    return () => clearInterval(timer)
  }, [authed, view, loadAvailability])

  // Retour d'onglet : re-synchronisation
  useEffect(() => {
    if (!authed || !pageVisible) return
    loadRooms()
    loadData()
    loadAvailability()
  }, [authed, pageVisible, loadRooms, loadData, loadAvailability])

  // Dérivés room courante
  const currentRoom = rooms.find(room => room.id === currentRoomId) || { id: 'marvel', name: 'Marvel' }
  const canDeleteCurrentRoom = currentRoom.id !== 'marvel' &&
    (currentRoom.can_delete || currentRoom.created_by === currentUser?.id || isAdmin)
  const canManageCurrentRoom = currentRoom.id === 'marvel'
    ? isAdmin
    : (currentRoom.can_manage || canDeleteCurrentRoom || isAdmin)

  // Membres de la room (uniquement quand une vue le demande, comme avant)
  useEffect(() => {
    if (!pageVisible || !membersWanted || !canDeleteCurrentRoom) {
      setRoomMembers([])
      return
    }
    let cancelled = false
    api('GET', `/auth/rooms?membersRoomId=${encodeURIComponent(currentRoomId)}`)
      .then(members => { if (!cancelled) setRoomMembers(members) })
      .catch(() => { if (!cancelled) setRoomMembers([]) })
    return () => { cancelled = true }
  }, [membersWanted, pageVisible, currentRoomId, canDeleteCurrentRoom])

  const selectRoom = useCallback(roomId => {
    setCurrentRoomId(roomId)
    saveStoredRoom(roomId)
    setRoomMembers([])
  }, [])

  return {
    rooms, setRooms,
    currentRoomId, selectRoom,
    currentRoom, canDeleteCurrentRoom, canManageCurrentRoom, isAdmin,
    watchlist, watched, availability, roomMembers, setRoomMembers, loading,
    loadRooms, loadData, loadAvailability,
    reset: () => { setWatchlist([]); setWatched([]); setAvailability([]); setRoomMembers([]) },
  }
}

import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Icon from '../widgets/Icon'
import { api } from '../../utils/api'

/**
 * Hub des rooms : toutes vos salles + découverte des rooms publiques,
 * avec recherche et filtres. Les rooms publiques sont chargées UNE fois
 * à l'ouverture du hub (aucune requête récurrente).
 */
export default function RoomsHubModal({
  myRooms, currentRoomId, onSelectRoom, onJoinPublic,
  onOpenJoinPrivate, onOpenCreate, onClose,
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'mine' | 'public'
  const [publicRooms, setPublicRooms] = useState([])
  const [loadingPublic, setLoadingPublic] = useState(true)
  const [joiningId, setJoiningId] = useState(null)

  // Découverte des rooms publiques — 1 requête à l'ouverture
  useEffect(() => {
    let cancelled = false
    api('GET', '/auth/rooms?discover=1')
      .then(rooms => { if (!cancelled) setPublicRooms(rooms) })
      .catch(() => { if (!cancelled) setPublicRooms([]) })
      .finally(() => { if (!cancelled) setLoadingPublic(false) })
    return () => { cancelled = true }
  }, [])

  const myRoomIds = useMemo(() => new Set(myRooms.map(r => r.id)), [myRooms])

  // Fusion : mes rooms + publiques non rejointes, filtrées par recherche
  const entries = useMemo(() => {
    const q = query.trim().toLowerCase()
    const mine = myRooms.map(room => ({
      id: room.id,
      name: room.name,
      isPublic: room.id === 'marvel' || room.is_private === false,
      joined: true,
      memberCount: publicRooms.find(p => p.id === room.id)?.member_count ?? null,
    }))
    const discoverable = publicRooms
      .filter(room => !myRoomIds.has(room.id))
      .map(room => ({
        id: room.id,
        name: room.name,
        isPublic: true,
        joined: false,
        memberCount: room.member_count ?? null,
      }))

    return [...mine, ...discoverable]
      .filter(entry => {
        if (filter === 'mine' && !entry.joined) return false
        if (filter === 'public' && !entry.isPublic) return false
        if (q && !entry.name.toLowerCase().includes(q)) return false
        return true
      })
  }, [myRooms, publicRooms, myRoomIds, query, filter])

  async function handleJoin(entry) {
    setJoiningId(entry.id)
    await onJoinPublic(entry.id)
    setJoiningId(null)
  }

  return (
    <Modal onClose={onClose} className="rooms-hub">
      <div className="modal-body">
        <span className="kicker">Salles</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 16px' }}>Toutes les rooms</h2>

        <div className="hub-search">
          <span className="search-icon"><Icon name="search" size={14} /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une room..."
            autoFocus
          />
        </div>

        <div className="filters" style={{ marginBottom: '16px' }}>
          {[['all', 'Toutes'], ['mine', 'Mes rooms'], ['public', 'Publiques']].map(([value, label]) => (
            <button key={value} className={`filter-btn ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>

        <div className="hub-list">
          {loadingPublic && entries.length === 0 && (
            <div className="search-empty">Chargement des rooms...</div>
          )}
          {!loadingPublic && entries.length === 0 && (
            <div className="search-empty">Aucune room ne correspond.</div>
          )}
          {entries.map(entry => (
            <div key={entry.id} className={`hub-room ${entry.id === currentRoomId ? 'current' : ''}`}>
              <div className="hub-room-icon"><Icon name="door" size={20} /></div>
              <div className="hub-room-body">
                <b>{entry.name}</b>
                <small>
                  {entry.isPublic ? 'Publique' : 'Privée'}
                  {entry.memberCount !== null ? ` · ${entry.memberCount} membre${entry.memberCount > 1 ? 's' : ''}` : ''}
                  {entry.id === currentRoomId ? ' · Vous êtes ici' : ''}
                </small>
              </div>
              {entry.id === currentRoomId ? (
                <span className="chip" style={{ color: 'var(--gold)' }}>Actuelle</span>
              ) : entry.joined ? (
                <button className="hub-room-go" onClick={() => { onSelectRoom(entry.id); onClose() }}>
                  Entrer
                </button>
              ) : (
                <button className="hub-room-go join" onClick={() => handleJoin(entry)} disabled={joiningId === entry.id}>
                  {joiningId === entry.id ? '...' : 'Rejoindre'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="hub-actions">
          <button className="btn-ghost" style={{ width: 'auto', marginTop: 0 }} onClick={() => { onClose(); onOpenJoinPrivate() }}>
            🔑 Rejoindre avec un code
          </button>
          <button className="btn-ghost" style={{ width: 'auto', marginTop: 0 }} onClick={() => { onClose(); onOpenCreate() }}>
            + Créer une room
          </button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useMemo, useState } from 'react'
import Icon from '../widgets/Icon'
import { api } from '../../utils/api'
import { TYPE_META } from '../../utils/constants'
import { formatDate } from '../../utils/format'

/**
 * Toutes mes notes, toutes rooms confondues — évite de changer de room et
 * de scroller pour retrouver l'avis laissé sur un titre. Chargé une fois
 * à l'ouverture de la vue (pas de polling, donnée personnelle stable).
 */
export default function MyRatingsView({ showToast }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api('GET', '/auth/my-ratings')
      .then(data => { if (!cancelled) setEntries(data) })
      .catch(e => { if (!cancelled) showToast?.(e.message || 'Impossible de charger vos notes.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => (e.title || '').toLowerCase().includes(q))
  }, [entries, query])

  return (
    <>
      <div className="view-head anim-up">
        <h1>Mes notes</h1>
        <p>
          Toutes vos notes, toutes rooms confondues
          {entries.length > 0 ? ` · ${entries.length} titre${entries.length > 1 ? 's' : ''} noté${entries.length > 1 ? 's' : ''}` : ''}
        </p>
      </div>

      <div className="global-search anim-up-1" style={{ marginBottom: '22px', marginLeft: 0 }}>
        <span className="search-icon"><Icon name="search" size={15} /></span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un titre parmi vos notes..."
          aria-label="Rechercher dans mes notes"
        />
      </div>

      {loading ? (
        <div className="empty-state"><div className="icon">⭐</div><p>Chargement de vos notes...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⭐</div>
          <p>
            {query
              ? 'Aucun titre ne correspond à votre recherche.'
              : "Vous n'avez encore noté aucun titre — notez un film ou une série depuis Regarder."}
          </p>
        </div>
      ) : (
        <div className="vu-list">
          {filtered.map(entry => {
            const meta = TYPE_META[entry.type] || TYPE_META.film
            const stars = '★'.repeat(Math.round(entry.rating / 2)) + '☆'.repeat(5 - Math.round(entry.rating / 2))
            return (
              <div key={entry.id} className="card vu-card anim-up-1">
                {entry.poster ? (
                  <img className="vu-poster" src={entry.poster} alt={entry.title || ''}
                    onError={e => (e.target.style.display = 'none')} />
                ) : (
                  <div className="vu-poster-ph">{meta.icon}</div>
                )}
                <div className="vu-info">
                  <div className="vu-title">
                    {entry.title || 'Titre supprimé'}
                    {entry.year && <span> ({entry.year})</span>}
                  </div>
                  <div className="vu-type">
                    {meta.label}{entry.room_name ? ` · ${entry.room_name}` : ''}
                  </div>
                  <div className="vu-entries">
                    <div className="vu-entry">
                      <div>
                        <span className="vu-stars">{stars}</span>
                        <span className="vu-num">{entry.rating}/10</span>
                      </div>
                      <div className="vu-date">Vu le {formatDate(entry.watched_at)}</div>
                      {entry.comment && <div className="vu-comment">{entry.comment}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

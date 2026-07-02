import { useMemo, useState } from 'react'
import { TYPE_META } from '../../utils/constants'
import { formatDate } from '../../utils/format'

/**
 * Déjà vu : avis groupés par titre, filtre "moi seulement".
 * Comportement identique à l'existant.
 */
export default function SeenView({ watchlist, watched, currentUser, isAdmin, onDeleteReview, onOpenDetails }) {
  const [filter, setFilter] = useState('all')

  const groupedItems = useMemo(() => {
    let entries = [...watched]
    if (filter === 'me') entries = entries.filter(e => e.user_id === currentUser?.id)

    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.item_id]) acc[entry.item_id] = []
      acc[entry.item_id].push(entry)
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([itemId, group]) => ({ item: watchlist.find(w => w.id === itemId), entries: group }))
      .filter(group => group.item)
  }, [watched, watchlist, filter, currentUser])

  return (
    <>
      <div className="view-head anim-up">
        <h1>Déjà vus</h1>
        <p>Notes et impressions de tous les membres</p>
      </div>

      <div className="filters anim-up-1">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tout le monde</button>
        <button className={`filter-btn ${filter === 'me' ? 'active' : ''}`} onClick={() => setFilter('me')}>Moi seulement</button>
      </div>

      {groupedItems.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⭐</div>
          <p>Aucune note pour le moment.</p>
        </div>
      ) : (
        <div className="vu-list">
          {groupedItems.map(({ item, entries }) => {
            const meta = TYPE_META[item.type] || TYPE_META.film
            return (
              <div key={item.id} className="card vu-card anim-up-1">
                {item.poster ? (
                  <img className="vu-poster" src={item.poster} alt={item.title}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onOpenDetails(item)}
                    onError={e => (e.target.style.display = 'none')} />
                ) : (
                  <div className="vu-poster-ph" style={{ cursor: 'pointer' }} onClick={() => onOpenDetails(item)}>
                    {meta.icon}
                  </div>
                )}

                <div className="vu-info">
                  <div className="vu-title">
                    {item.title}
                    {item.year && <span> ({item.year})</span>}
                  </div>
                  <div className="vu-type">{meta.label}</div>

                  <div className="vu-entries">
                    {entries.map(entry => {
                      const stars = '★'.repeat(Math.round(entry.rating / 2)) + '☆'.repeat(5 - Math.round(entry.rating / 2))
                      return (
                        <div key={entry.id} className="vu-entry">
                          <div>
                            <span className="vu-stars">{stars}</span>
                            <span className="vu-num">{entry.rating}/10</span>
                          </div>
                          <div className="vu-date">Vu le {formatDate(entry.watched_at)}</div>
                          {entry.comment && <div className="vu-comment">{entry.comment}</div>}
                          <div className="vu-user-tag">Par <b>{entry.pseudo}</b></div>
                          {(entry.user_id === currentUser?.id || isAdmin) && (
                            <button className="btn-del-review" onClick={() => onDeleteReview(entry.id)}>
                              Supprimer l'avis
                            </button>
                          )}
                        </div>
                      )
                    })}
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

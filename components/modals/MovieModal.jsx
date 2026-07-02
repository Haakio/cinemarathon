import { useMemo } from 'react'
import Modal from './Modal'
import { TYPE_META } from '../../utils/constants'
import { formatDate, formatMinutes } from '../../utils/format'
import { getRuntime } from '../../utils/stats'

/**
 * Fiche film : backdrop cinématique, poster, synopsis, casting (TMDB),
 * plateforme, et toutes les notes/commentaires des membres.
 * N'utilise que les données déjà en mémoire.
 */
export default function MovieModal({ item, watched, currentUser, isAdmin, onClose, onWatch, onDeleteReview }) {
  const meta = TYPE_META[item.type] || TYPE_META.film

  const cast = useMemo(() => {
    try {
      const parsed = JSON.parse(item.cast_json || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }, [item.cast_json])

  const reviews = useMemo(
    () => watched
      .filter(w => w.item_id === item.id)
      .sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at)),
    [watched, item.id]
  )

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
    : null

  return (
    <Modal onClose={onClose} className="movie-modal">
      <div className="movie-modal-hero">
        {(item.backdrop || item.poster) && (
          <div className="movie-modal-backdrop" style={{ backgroundImage: `url(${item.backdrop || item.poster})` }} />
        )}
        <div className="movie-modal-scrim" />
        <div className="movie-modal-head">
          {item.poster
            ? <img className="movie-modal-poster" src={item.poster} alt={item.title} onError={e => { e.target.style.display = 'none' }} />
            : <div className="movie-modal-poster-ph">{meta.icon}</div>}
          <div className="movie-modal-titles">
            <h2>{item.title}</h2>
            <div className="meta-row">
              <span className="chip">{meta.icon} {meta.label}</span>
              {item.year && <span className="chip">{item.year}</span>}
              <span className="chip">◷ {formatMinutes(getRuntime(item))}</span>
              {avgRating && <span className="chip" style={{ color: 'var(--gold)' }}>★ {avgRating}/10</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="movie-modal-content">
        {(item.platform || item.watch_url) && (
          <div className="movie-modal-section" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-play" style={{ marginTop: 0 }} onClick={() => onWatch(item.id)}>▶ Regarder maintenant</button>
            {item.watch_url && (
              <a className="chip" href={item.watch_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                Ouvrir{item.platform ? ` sur ${item.platform}` : ' le lien'} ↗
              </a>
            )}
          </div>
        )}
        {!item.platform && !item.watch_url && (
          <div className="movie-modal-section">
            <button className="btn-play" style={{ marginTop: 0 }} onClick={() => onWatch(item.id)}>▶ Regarder maintenant</button>
          </div>
        )}

        {item.synopsis && (
          <div className="movie-modal-section">
            <h4>Synopsis</h4>
            <p>{item.synopsis}</p>
          </div>
        )}

        {item.genres && (
          <div className="movie-modal-section">
            <h4>Genres</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {item.genres.split(',').map(genre => (
                <span className="chip" key={genre.trim()}>{genre.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {cast.length > 0 && (
          <div className="movie-modal-section">
            <h4>Casting</h4>
            <div className="cast-row">
              {cast.map(actor => (
                <div className="cast-chip" key={actor.name}>
                  {actor.photo
                    ? <img src={actor.photo} alt={actor.name} onError={e => { e.target.style.display = 'none' }} />
                    : <div className="cast-ph">🎭</div>}
                  <b>{actor.name}</b>
                  {actor.character && <span>{actor.character}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="movie-modal-section">
          <h4>Notes des membres{reviews.length ? ` (${reviews.length})` : ''}</h4>
          {reviews.length === 0 ? (
            <p>Personne n'a encore noté ce titre. Soyez le premier !</p>
          ) : reviews.map(entry => (
            <div className="review-row" key={entry.id}>
              <div className="review-head">
                <span className="stars">
                  {'★'.repeat(Math.round(entry.rating / 2))}{'☆'.repeat(5 - Math.round(entry.rating / 2))}
                </span>
                <b>{entry.rating}/10 · {entry.pseudo}</b>
                <small>{formatDate(entry.watched_at)}</small>
              </div>
              {entry.comment && <div className="review-comment">« {entry.comment} »</div>}
              {(entry.user_id === currentUser?.id || isAdmin) && (
                <button className="btn-del-review" onClick={() => onDeleteReview(entry.id)}>Supprimer l'avis</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

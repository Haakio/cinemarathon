import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { TYPE_META } from '../../utils/constants'
import { formatDate } from '../../utils/format'
import { getSeenItemIds } from '../../utils/stats'

/**
 * Vue Regarder : carrousel de séance, notation et commentaire.
 * Logique identique à l'existant (mêmes endpoints, même enchaînement).
 */
export default function WatchView({ watchlist, watched, currentUser, watchIdx, setWatchIdx, currentRoomId, loadData, showToast }) {
  const [currentRating, setCurrentRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  const seenItemIds = getSeenItemIds(watched)
  const currentItem = watchlist[watchIdx] || null
  const myWatchEntry = currentItem
    ? watched.find(w => w.item_id === currentItem.id && w.user_id === currentUser?.id)
    : null
  const anySeen = currentItem ? seenItemIds.includes(currentItem.id) : false

  // Synchronise note/commentaire quand on change de titre
  useEffect(() => {
    if (!watchlist.length) return
    const item = watchlist[watchIdx]
    if (!item) return
    const myEntry = watched.find(w => w.item_id === item.id && w.user_id === currentUser?.id)
    setCurrentRating(myEntry ? myEntry.rating : 0)
    setComment(myEntry ? (myEntry.comment || '') : '')
  }, [watchIdx, watchlist, watched, currentUser])

  async function markWatched() {
    if (!currentRating) { showToast("Attribuez d'abord une note !"); return }
    const item = watchlist[watchIdx]
    try {
      await api('POST', '/auth/watchlist/watched', { roomId: currentRoomId, itemId: item.id, rating: currentRating, comment })
      showToast('✓ Enregistré !')
      loadData()
    } catch (e) { showToast('Erreur: ' + e.message) }
  }

  async function saveAndNext() {
    if (currentRating > 0 || comment.trim()) await markWatched()
    if (watchIdx < watchlist.length - 1) {
      setWatchIdx(watchIdx + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      showToast('🎉 Marathon terminé !')
    }
  }

  if (watchlist.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🎬</div>
        <p>Aucun film ou série.<br />Ajoutez-en dans l'onglet Administration !</p>
      </div>
    )
  }

  const meta = TYPE_META[currentItem?.type] || TYPE_META.film

  return (
    <div className="watch-container anim-up">
      <div className="watch-progress-label">
        <span>Progression du marathon</span>
        <span>{seenItemIds.length} / {watchlist.length}</span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: watchlist.length > 0 ? `${(seenItemIds.length / watchlist.length * 100).toFixed(1)}%` : '0%' }} />
      </div>

      <div className="carousel-row">
        <button className="carousel-arrow" onClick={() => setWatchIdx(Math.max(0, watchIdx - 1))} disabled={watchIdx === 0}>‹</button>

        <div className="watch-poster-wrap">
          {currentItem?.poster
            ? <img src={currentItem.poster} alt={currentItem.title}
                onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex' }} />
            : null}
          <div className="watch-poster-placeholder" style={currentItem?.poster ? { display: 'none' } : {}}>
            {meta.icon}
          </div>
          <div className="watch-poster-overlay">
            <div className="watch-num">#{currentItem?.order} · {meta.label}</div>
            <div className="watch-title">{currentItem?.title}{currentItem?.year ? ` (${currentItem.year})` : ''}</div>
          </div>
          {anySeen && (
            <div className="watch-seen-overlay">
              <div className="watch-seen-badge">✓ Déjà vu</div>
            </div>
          )}
        </div>

        <button className="carousel-arrow" onClick={() => setWatchIdx(Math.min(watchlist.length - 1, watchIdx + 1))} disabled={watchIdx === watchlist.length - 1}>›</button>
      </div>

      <div className="watch-counter-row">
        <span className="watch-counter">{watchIdx + 1} / {watchlist.length}</span>
      </div>

      {currentItem?.watch_url && (
        <a className="watch-link" href={currentItem.watch_url} target="_blank" rel="noopener noreferrer">
          Regarder{currentItem.platform ? ` sur ${currentItem.platform}` : ''}
        </a>
      )}

      <div className="rating-section">
        <div className="rating-label">Votre note</div>
        <div className="stars-row">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(i => (
            <span key={i}
              className={`star ${i <= (hoverRating || currentRating) ? 'filled' : ''}`}
              onClick={() => setCurrentRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
            >★</span>
          ))}
        </div>
        <div className="rating-value">{(hoverRating || currentRating) > 0 ? `${hoverRating || currentRating} / 10` : '— / 10'}</div>
      </div>

      <div className="comment-section">
        <div className="comment-label">Note / Commentaire</div>
        <textarea className="comment-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Vos impressions…" />
      </div>

      <div className="watch-actions">
        <button className="btn-mark" onClick={markWatched}
          style={myWatchEntry ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
          {myWatchEntry ? '✓ Modifier' : '✓ Marquer vu'}
        </button>
        <button className="btn-next" onClick={saveAndNext}>
          {watchIdx === watchlist.length - 1 ? 'TERMINER ✓' : 'SUIVANT →'}
        </button>
      </div>
      {myWatchEntry && (
        <div className="watch-noted">Noté le {formatDate(myWatchEntry.watched_at)}</div>
      )}
    </div>
  )
}

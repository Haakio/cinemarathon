import { memo } from 'react'
import { TYPE_META } from '../../utils/constants'

/**
 * Carte film premium : hover zoom + glow, actions rapides (fiche / regarder).
 * Mémoïsée : la grille peut contenir ~100 cartes, on évite les re-renders
 * quand seuls d'autres états du parent changent.
 */
function MovieCard({ item, isSeen, myRating, onOpenDetails, onWatch }) {
  const meta = TYPE_META[item.type] || TYPE_META.film

  return (
    <article className="movie-card" onClick={() => onOpenDetails(item)}>
      <div className="movie-poster-wrap">
        <div className="movie-num">{item.order}</div>
        {isSeen && <div className="movie-seen">✓ Vu</div>}
        {item.poster
          ? <img className="movie-poster" src={item.poster} alt={item.title} loading="lazy"
              onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex' }} />
          : null}
        <div className="movie-poster-ph" style={item.poster ? { display: 'none' } : {}}>{meta.icon}</div>
        <div className="movie-hover">
          <button className="mh-primary" onClick={e => { e.stopPropagation(); onWatch(item.id) }}>▶ Regarder</button>
          <button className="mh-secondary" onClick={e => { e.stopPropagation(); onOpenDetails(item) }}>Fiche</button>
        </div>
      </div>
      <div className="movie-info">
        <div className="movie-title">
          {item.title}{item.year ? <span> ({item.year})</span> : null}
        </div>
        <div className="movie-sub">
          {meta.label}
          {myRating ? <span className="rating">★ {myRating}/10</span> : null}
        </div>
      </div>
    </article>
  )
}

export default memo(MovieCard)

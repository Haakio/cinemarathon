import { TYPE_META } from '../../utils/constants'
import { formatMinutes, truncate } from '../../utils/format'
import { getRuntime } from '../../utils/stats'

/**
 * Prochain film à regarder : poster, synopsis (TMDB), durée, plateforme,
 * bouton « Démarrer la séance » qui ouvre la vue Regarder au bon index.
 */
export default function NextUpCard({ item, onStart, onOpenDetails }) {
  if (!item) {
    return (
      <section className="card next-card anim-up-3">
        <div className="next-body">
          <span className="kicker">Prochain film</span>
          <h3>Marathon terminé 🎉</h3>
          <p className="next-synopsis">Tous les titres de la liste ont été vus. Ajoutez-en de nouveaux ou lancez un autre marathon !</p>
        </div>
      </section>
    )
  }

  const meta = TYPE_META[item.type] || TYPE_META.film

  return (
    <section className="card next-card anim-up-3">
      {item.poster
        ? <img className="next-poster" src={item.poster} alt={item.title} onError={e => { e.target.style.display = 'none' }} />
        : <div className="next-poster-ph">{meta.icon}</div>}
      <div className="next-body">
        <span className="kicker">Prochain film</span>
        <h3>{item.title}{item.year ? ` (${item.year})` : ''}</h3>
        {item.synopsis
          ? <p className="next-synopsis">{truncate(item.synopsis, 190)}</p>
          : <p className="next-synopsis">#{item.order} du marathon — {meta.label.toLowerCase()} au programme.</p>}
        <div className="next-meta">
          <span className="chip">{meta.icon} {meta.label}</span>
          <span className="chip">◷ {formatMinutes(getRuntime(item))}</span>
          {item.platform && <span className="chip">▶ {item.platform}</span>}
          {item.genres && <span className="chip">{item.genres.split(',')[0].trim()}</span>}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-play" onClick={() => onStart(item.id)}>▶ Démarrer la séance</button>
          <button className="btn-play" style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)' }} onClick={() => onOpenDetails(item)}>
            Fiche
          </button>
        </div>
      </div>
    </section>
  )
}

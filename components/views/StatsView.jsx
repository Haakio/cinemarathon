import { useMemo } from 'react'
import { formatMinutes } from '../../utils/format'
import {
  getGenreBreakdown, getProgress, getProgressTimeline, getRatingDistribution,
} from '../../utils/stats'

/**
 * Statistiques : graphiques SVG/CSS faits main (zéro dépendance),
 * calculés à partir des données déjà chargées.
 */
export default function StatsView({ currentRoom, watchlist, watched }) {
  const progress = useMemo(() => getProgress(watchlist, watched), [watchlist, watched])
  const genres = useMemo(() => getGenreBreakdown(watchlist), [watchlist])
  const ratings = useMemo(() => getRatingDistribution(watched), [watched])
  const timeline = useMemo(() => getProgressTimeline(watchlist, watched), [watchlist, watched])

  const maxGenre = Math.max(1, ...genres.map(g => g.count))
  const maxRating = Math.max(1, ...ratings.map(r => r.count))
  const avgRating = watched.length
    ? Math.round((watched.reduce((sum, w) => sum + (w.rating || 0), 0) / watched.length) * 10) / 10
    : 0

  // Courbe de progression (SVG line chart)
  const chart = useMemo(() => {
    const { points, total } = timeline
    const W = 640, H = 180, PAD = 14
    if (points.length < 2 || total === 0) return null
    const minT = points[0].time
    const maxT = points[points.length - 1].time
    const span = Math.max(1, maxT - minT)
    const x = t => PAD + ((t - minT) / span) * (W - PAD * 2)
    const y = c => H - PAD - (c / total) * (H - PAD * 2)
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
    const area = `${path} L${x(maxT).toFixed(1)},${H - PAD} L${x(minT).toFixed(1)},${H - PAD} Z`
    return { W, H, path, area }
  }, [timeline])

  return (
    <>
      <div className="view-head anim-up">
        <h1>Statistiques</h1>
        <p>Les chiffres du marathon {currentRoom.name}</p>
      </div>

      <div className="stats-grid">
        <div className="card anim-up-1">
          <h2>En résumé</h2>
          <div className="stats-highlight">
            <b>{formatMinutes(progress.watchedMinutes)}</b>
            <span>Temps regardé</span>
          </div>
          <div className="stats-highlight">
            <b>{formatMinutes(progress.remainingMinutes)}</b>
            <span>Temps restant estimé</span>
          </div>
          <div className="stats-highlight">
            <b>{avgRating > 0 ? `${avgRating}/10` : '—'}</b>
            <span>Note moyenne de la room</span>
          </div>
          <div className="stats-highlight">
            <b>{watched.length}</b>
            <span>Avis déposés</span>
          </div>
        </div>

        <div className="card anim-up-2">
          <h2>Genres du marathon</h2>
          {genres.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.6 }}>
              Les genres apparaissent quand les titres sont ajoutés via la recherche TMDB (onglet Administration).
            </p>
          ) : genres.map(g => (
            <div className="hbar-row" key={g.genre}>
              <div className="hbar-label">{g.genre}</div>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${(g.count / maxGenre) * 100}%` }} />
              </div>
              <div className="hbar-value">{g.count}</div>
            </div>
          ))}
        </div>

        <div className="card anim-up-2">
          <h2>Distribution des notes</h2>
          {watched.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Aucune note pour le moment.</p>
          ) : (
            <div className="vbars">
              {ratings.map(r => (
                <div className="vbar-col" key={r.rating}>
                  <div className="vbar" style={{ height: `${(r.count / maxRating) * 100}%` }} title={`${r.count} note${r.count > 1 ? 's' : ''}`} />
                  <span>{r.rating}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card wide anim-up-3">
          <h2>Progression dans le temps</h2>
          {!chart ? (
            <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
              La courbe apparaît après quelques visionnages.
            </p>
          ) : (
            <svg className="stats-line-chart" viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={chart.area} fill="url(#areaGradient)" />
              <path d={chart.path} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </>
  )
}

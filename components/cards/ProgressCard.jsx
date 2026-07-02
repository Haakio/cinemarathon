import AnimatedNumber from '../widgets/AnimatedNumber'
import ProgressRing from '../widgets/ProgressRing'
import { formatMinutes } from '../../utils/format'

/**
 * Grande carte de progression : anneau animé, barre, tuiles de statistiques.
 * 100 % dérivée des données déjà en mémoire.
 */
export default function ProgressCard({ progress }) {
  return (
    <section className="card progress-card anim-up-1">
      <ProgressRing percent={progress.percent} />
      <div className="progress-body">
        <h2>Progression globale</h2>
        <div className="progress-sub">
          <AnimatedNumber value={progress.seen} /> / {progress.total} titres vus
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="progress-stats">
          <div className="stat-tile"><b><AnimatedNumber value={progress.total} /></b><span>Titres</span></div>
          <div className="stat-tile"><b><AnimatedNumber value={progress.seen} /></b><span>Vus</span></div>
          <div className="stat-tile"><b><AnimatedNumber value={progress.remaining} /></b><span>Restants</span></div>
          <div className="stat-tile"><b>{formatMinutes(progress.watchedMinutes)}</b><span>Regardé</span></div>
          <div className="stat-tile"><b>{formatMinutes(progress.remainingMinutes)}</b><span>Restant estimé</span></div>
        </div>
      </div>
    </section>
  )
}

import { formatRelative } from '../../utils/format'

/**
 * Timeline verticale d'activité (avis déposés, dispos cochées).
 * Entièrement dérivée des données déjà chargées.
 */
export default function ActivityFeed({ activity }) {
  return (
    <section className="card anim-up-1">
      <div className="card-title-row">
        <h2>Activité en direct</h2>
        <span className="member-status online" style={{ position: 'static', width: 9, height: 9, border: 'none' }} />
      </div>
      {activity.length === 0 ? (
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          Encore calme ici... Les notes et dispos des membres apparaîtront en direct.
        </p>
      ) : (
        <div className="activity-list">
          {activity.map(event => (
            <div className="activity-item" key={event.id}>
              <div className="activity-icon">{event.icon}</div>
              <div className="activity-body">
                <div className="activity-text"><b>{event.pseudo}</b> {event.text}</div>
                <div className="activity-time">{formatRelative(event.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

import { initials, pseudoHue } from '../../utils/format'

/**
 * Membres de la room : avatar coloré déterministe, statut, progression.
 * Liste dérivée des traces d'activité — aucune requête dédiée.
 */
export default function MembersCard({ members }) {
  return (
    <section className="card anim-up-2">
      <div className="card-title-row">
        <h2>Membres{members.length ? ` (${members.length})` : ''}</h2>
      </div>
      {members.length === 0 ? (
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          Les membres apparaissent ici dès qu'ils participent (note, dispo, message).
        </p>
      ) : members.map(member => (
        <div className="member-row" key={member.pseudo}>
          <div
            className="member-avatar"
            style={{ background: `linear-gradient(135deg, hsl(${pseudoHue(member.pseudo)}, 45%, 62%), hsl(${pseudoHue(member.pseudo)}, 50%, 40%))` }}
          >
            {initials(member.pseudo)}
            <span className={`member-status ${member.online ? 'online' : ''}`} />
          </div>
          <div className="member-body">
            <div className="member-name">
              {member.pseudo}
              {member.isMe && <span className="me-tag">Toi</span>}
            </div>
            <div className="member-bar">
              <div className="member-bar-fill" style={{ width: `${member.percent}%` }} />
            </div>
          </div>
          <div className="member-percent">{member.percent}%</div>
        </div>
      ))}
    </section>
  )
}

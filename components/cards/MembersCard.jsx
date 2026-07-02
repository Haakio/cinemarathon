import Avatar from '../widgets/Avatar'

/**
 * Membres de la room : avatar (personnalisé si défini, sinon généré),
 * statut en ligne, progression individuelle.
 */
export default function MembersCard({ members, avatarMap = {} }) {
  const avatarOf = member =>
    avatarMap[member.userId] || avatarMap[(member.pseudo || '').toLowerCase()] || {}

  return (
    <section className="card anim-up-2">
      <div className="card-title-row">
        <h2>Membres{members.length ? ` (${members.length})` : ''}</h2>
      </div>
      {members.length === 0 ? (
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          Les membres apparaissent ici dès qu'ils participent (note, dispo, message).
        </p>
      ) : members.map(member => {
        const custom = avatarOf(member)
        return (
          <div className="member-row" key={member.pseudo}>
            <div className="member-avatar-wrap">
              <Avatar
                pseudo={member.pseudo}
                emoji={custom.emoji || ''}
                hue={custom.hue ?? null}
                url={custom.url || ''}
                size={36}
              />
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
        )
      })}
    </section>
  )
}

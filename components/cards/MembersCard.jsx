import { useMemo, useState } from 'react'
import Avatar from '../widgets/Avatar'
import UserTag from '../widgets/UserTag'
import ModBadge from '../widgets/ModBadge'

/**
 * Membres de la room : avatar (personnalisé si défini, sinon généré),
 * statut en ligne, progression individuelle. Filtre "Amis" en plus de
 * "Tout le monde" si l'utilisateur a des amis présents dans cette room.
 */
export default function MembersCard({ members, avatarMap = {}, friends = [] }) {
  const [filter, setFilter] = useState('all')
  const avatarOf = member =>
    avatarMap[member.userId] || avatarMap[(member.pseudo || '').toLowerCase()] || {}

  const friendIds = useMemo(() => new Set(friends.map(f => f.userId)), [friends])
  const hasFriendsHere = useMemo(() => members.some(m => friendIds.has(m.userId)), [members, friendIds])
  const visibleMembers = filter === 'friends' ? members.filter(m => friendIds.has(m.userId)) : members

  return (
    <section className="card anim-up-2">
      <div className="card-title-row">
        <h2>Membres{members.length ? ` (${members.length})` : ''}</h2>
      </div>
      {hasFriendsHere && (
        <div className="filters" style={{ marginBottom: '12px' }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tout le monde</button>
          <button className={`filter-btn ${filter === 'friends' ? 'active' : ''}`} onClick={() => setFilter('friends')}>Amis</button>
        </div>
      )}
      {visibleMembers.length === 0 ? (
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          {filter === 'friends'
            ? "Aucun de vos amis n'est dans cette room."
            : 'Les membres apparaissent ici dès qu\'ils participent (note, dispo, message).'}
        </p>
      ) : (
      <div className="members-list">
      {visibleMembers.map(member => {
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
                <UserTag entry={custom} />
                <ModBadge entry={custom} pseudo={member.pseudo} />
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
      </div>
      )}
    </section>
  )
}

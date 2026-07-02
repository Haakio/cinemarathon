import { useMemo } from 'react'
import { buildLeaderboard } from '../../utils/stats'
import { buildBadgeContext, computeBadges } from '../../lib/badges'
import { initials, pseudoHue } from '../../utils/format'

/**
 * Classement : podium, liste XP, badges du membre courant.
 * Entièrement dérivé des avis existants — l'XP est calculée côté client
 * (50 XP par titre vu, 15 par commentaire, 10 par note).
 */
export default function LeaderboardView({ currentRoom, currentUser, watchlist, watched, availability, chatMessages }) {
  const leaderboard = useMemo(() => buildLeaderboard({ watchlist, watched }), [watchlist, watched])
  const podium = leaderboard.slice(0, 3)
  const isMe = row => row.userId === currentUser?.id ||
    row.pseudo.toLowerCase() === (currentUser?.pseudo || '').toLowerCase()

  const myBadges = useMemo(() => computeBadges(buildBadgeContext({
    userId: currentUser?.id,
    pseudo: currentUser?.pseudo,
    watchlist, watched, availability, chatMessages,
  })), [currentUser, watchlist, watched, availability, chatMessages])

  const avatarStyle = pseudo => ({
    background: `linear-gradient(135deg, hsl(${pseudoHue(pseudo)}, 45%, 62%), hsl(${pseudoHue(pseudo)}, 50%, 40%))`,
  })

  // Ordre visuel du podium : 2e, 1er, 3e
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean)
  const rankClass = row => row === podium[0] ? 'first' : row === podium[1] ? 'second' : 'third'
  const rankNumber = row => podium.indexOf(row) + 1

  return (
    <>
      <div className="view-head anim-up">
        <h1>Classement</h1>
        <p>Qui mène le marathon {currentRoom.name} ?</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏆</div>
          <p>Le classement apparaît dès les premières notes.<br />Lancez une séance !</p>
        </div>
      ) : (
        <>
          {podium.length > 1 && (
            <div className="podium anim-up-1">
              {podiumOrder.map(row => (
                <div className={`podium-slot ${rankClass(row)}`} key={row.pseudo}>
                  <div className="podium-avatar" style={avatarStyle(row.pseudo)}>{initials(row.pseudo)}</div>
                  <div className="podium-name">{row.pseudo}</div>
                  <div className="podium-xp">{row.xp} XP</div>
                  <div className="podium-base">{rankNumber(row)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="anim-up-2">
            {leaderboard.map((row, index) => (
              <div className={`lb-row ${isMe(row) ? 'me' : ''}`} key={row.pseudo}>
                <div className="lb-rank">{index + 1}</div>
                <div className="member-avatar" style={avatarStyle(row.pseudo)}>{initials(row.pseudo)}</div>
                <div className="lb-body">
                  <div className="lb-name">{row.pseudo}{isMe(row) ? ' (toi)' : ''}</div>
                  <div className="lb-details">
                    {row.seen} vu{row.seen > 1 ? 's' : ''} ({row.percent}%)
                    {row.avgRating > 0 ? ` · note moy. ${row.avgRating}/10` : ''}
                    {row.comments > 0 ? ` · ${row.comments} commentaire${row.comments > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <div className="lb-xp">{row.xp} XP</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card anim-up-3" style={{ marginTop: '26px' }}>
        <h2>Mes badges</h2>
        <div className="badges-grid">
          {myBadges.map(badge => (
            <div className={`badge-tile ${badge.unlocked ? 'unlocked' : 'locked'}`} key={badge.id}>
              <div className="badge-icon">{badge.icon}</div>
              <b>{badge.name}</b>
              <span>{badge.description}</span>
            </div>
          ))}
        </div>
        <div className="lb-note">
          L'XP et les badges sont calculés à partir de l'activité du marathon (titres vus, notes, commentaires).
          D'autres badges et des saisons de classement arriveront dans de futures mises à jour.
        </div>
      </div>
    </>
  )
}

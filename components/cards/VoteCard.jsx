import { useEffect, useMemo, useState } from 'react'
import Avatar from '../widgets/Avatar'
import JimmyPlayer from '../widgets/JimmyPlayer'
import { JIMMY_CONFIG } from '../../utils/constants'

/** "2h 05min" restantes, mis à jour chaque seconde (purement client). */
function useCountdown(endsAt, active) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!active || !endsAt) return
    const compute = () => {
      const ms = new Date(endsAt).getTime() - Date.now()
      if (ms <= 0) { setLabel('Clôture...'); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setLabel(h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : m > 0 ? `${m}min ${String(s).padStart(2, '0')}s` : `${s}s`)
    }
    compute()
    const timer = setInterval(compute, 1000)
    return () => clearInterval(timer)
  }, [endsAt, active])
  return label
}

/**
 * Carte de vote (vue d'ensemble) : posters cliquables, résultats live,
 * avatars des votants, compte à rebours. Une fois clos : gagnant — et en
 * cas d'égalité, le bouton "Laisser Jimmy choisir".
 */
export default function VoteCard({ vote, ballots, myBallot, watchlist, currentUser, avatarMap, onBallot }) {
  const [jimmyOpen, setJimmyOpen] = useState(false)
  const isOpen = vote.status === 'open'
  const countdown = useCountdown(vote.ends_at, isOpen)

  const options = useMemo(() => {
    const itemIds = (() => { try { return JSON.parse(vote.item_ids || '[]') } catch { return [] } })()
    return itemIds
      .map(id => watchlist.find(w => w.id === id))
      .filter(Boolean)
  }, [vote.item_ids, watchlist])

  const countFor = itemId => ballots.filter(b => b.item_id === itemId).length
  const totalBallots = ballots.length
  const maxCount = Math.max(1, ...options.map(item => countFor(item.id)))

  const tieBreak = useMemo(() => {
    try { return vote.tie_break ? JSON.parse(vote.tie_break) : null } catch { return null }
  }, [vote.tie_break])

  const winner = vote.winner_item_id ? watchlist.find(w => w.id === vote.winner_item_id) : null
  const avatarOf = ballot => avatarMap[ballot.user_id] || avatarMap[(ballot.pseudo || '').toLowerCase()] || {}

  return (
    <section className="card vote-card anim-up">
      <div className="card-title-row">
        <h2>🗳️ {isOpen ? 'Vote en cours : le prochain film' : 'Résultat du vote'}</h2>
        {isOpen && <span className="chip vote-countdown">◷ {countdown}</span>}
      </div>

      {isOpen && (
        <p className="vote-hint">
          {myBallot ? 'Vous avez voté — cliquez sur un autre film pour changer.' : 'Cliquez sur un film pour voter !'}
          {totalBallots > 0 ? ` · ${totalBallots} vote${totalBallots > 1 ? 's' : ''}` : ''}
        </p>
      )}

      <div className="vote-options">
        {options.map(item => {
          const count = countFor(item.id)
          const mine = myBallot?.item_id === item.id
          const isWinner = !isOpen && vote.winner_item_id === item.id
          return (
            <button
              key={item.id}
              className={`vote-option ${mine ? 'mine' : ''} ${isWinner ? 'winner' : ''}`}
              onClick={() => isOpen && onBallot(item.id)}
              disabled={!isOpen}
            >
              {item.poster
                ? <img src={item.poster} alt={item.title} onError={e => { e.target.style.display = 'none' }} />
                : <div className="vote-poster-ph">🎬</div>}
              <div className="vote-option-body">
                <b>{item.title}</b>
                <div className="vote-bar">
                  <div className="vote-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <div className="vote-voters">
                  <span>{count} vote{count > 1 ? 's' : ''}</span>
                  <span className="vote-avatars">
                    {ballots.filter(b => b.item_id === item.id).slice(0, 6).map(b => {
                      const custom = avatarOf(b)
                      return <Avatar key={b.user_id} pseudo={b.pseudo} emoji={custom.emoji || ''} hue={custom.hue ?? null} url={custom.url || ''} size={18} />
                    })}
                  </span>
                </div>
              </div>
              {mine && isOpen && <span className="vote-my-tag">Mon vote</span>}
              {isWinner && <span className="vote-winner-tag">🏆 Gagnant</span>}
            </button>
          )
        })}
      </div>

      {!isOpen && winner && (
        <div className="vote-result-row">
          {tieBreak ? (
            <>
              <span>Égalité parfaite entre les deux premiers...</span>
              <button className="btn-play" style={{ marginTop: 0 }} onClick={() => setJimmyOpen(true)}>
                {JIMMY_CONFIG.buttonLabel}
              </button>
            </>
          ) : (
            <span>🏆 <b>{winner.title}</b> remporte le vote — c'est le prochain film de la séance !</span>
          )}
        </div>
      )}

      {jimmyOpen && tieBreak && (
        <JimmyPlayer
          leftItem={watchlist.find(w => w.id === tieBreak.left)}
          rightItem={watchlist.find(w => w.id === tieBreak.right)}
          winnerSide={tieBreak.winnerSide}
          onClose={() => setJimmyOpen(false)}
        />
      )}
    </section>
  )
}

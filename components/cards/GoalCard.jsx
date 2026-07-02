import { useState } from 'react'
import { daysUntil, formatDate } from '../../utils/format'

/**
 * Objectif du marathon : deadline, temps restant, progression vers l'objectif.
 * Stocké en localStorage par room (aucun coût serveur) — modifiable en un clic.
 */
export default function GoalCard({ goal, progress, onSaveGoal }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(goal.label)
  const [date, setDate] = useState(goal.date)

  const days = daysUntil(goal.date)
  const onTrack = progress.percent >= 100 || days > progress.remaining

  function save() {
    if (!label.trim() || !date) return
    onSaveGoal({ label: label.trim(), date })
    setEditing(false)
  }

  return (
    <section className="card goal-card anim-up-2">
      <div className="card-title-row">
        <h2>Objectif</h2>
        <span className="chip">{onTrack ? '🎯 En bonne voie' : '⏰ Ça va être serré'}</span>
      </div>
      <div className="goal-row">
        <div className="goal-label">{goal.label}</div>
        <div className="goal-days">{days > 0 ? `J-${days}` : 'Dernier jour !'}</div>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="goal-date">
        Échéance : {formatDate(goal.date)} · {progress.remaining} titre{progress.remaining > 1 ? 's' : ''} restant{progress.remaining > 1 ? 's' : ''}
      </div>

      {editing ? (
        <div className="goal-edit">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nom de l'objectif" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={save}>OK</button>
        </div>
      ) : (
        <button className="goal-edit-toggle" onClick={() => { setLabel(goal.label); setDate(goal.date); setEditing(true) }}>
          Modifier l'objectif
        </button>
      )}
    </section>
  )
}

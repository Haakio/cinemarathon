import { useEffect, useState } from 'react'
import { daysUntil, formatDate } from '../../utils/format'

/**
 * Objectif du marathon — PARTAGÉ par la room (stocké en base) :
 * l'admin le définit, tout le monde le voit. Optionnel : ajout,
 * modification et suppression par les admins de la room.
 */
export default function GoalCard({ goal, progress, canManage, onSaveGoal, onDeleteGoal }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    setLabel(goal?.label || '')
    setDate(goal?.date || '')
    setEditing(false)
  }, [goal])

  function save() {
    if (!label.trim() || !date) return
    onSaveGoal({ label: label.trim(), date })
    setEditing(false)
  }

  // ── Pas d'objectif : proposition d'en créer un (admins uniquement,
  //    la carte est masquée pour les autres par le parent) ──
  if (!goal) {
    return (
      <section className="card goal-card anim-up-2">
        <div className="card-title-row">
          <h2>Objectif</h2>
          <span className="chip">Optionnel</span>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
          Donnez une deadline au marathon — « Terminer avant Noël », « Finir avant la sortie du prochain film »...
          Visible par toute la room.
        </p>
        <div className="goal-edit">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nom de l'objectif" maxLength={60} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={save} disabled={!label.trim() || !date}>Définir</button>
        </div>
      </section>
    )
  }

  const days = daysUntil(goal.date)
  const onTrack = progress.percent >= 100 || days > progress.remaining

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

      {canManage && (
        editing ? (
          <div className="goal-edit">
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nom de l'objectif" maxLength={60} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <button onClick={save}>OK</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '14px' }}>
            <button className="goal-edit-toggle" onClick={() => setEditing(true)}>
              Modifier l'objectif
            </button>
            <button className="goal-edit-toggle" style={{ color: 'var(--text3)' }} onClick={onDeleteGoal}>
              Supprimer
            </button>
          </div>
        )
      )}
    </section>
  )
}

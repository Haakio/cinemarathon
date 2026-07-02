import { useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { AVAILABILITY_PREFERENCES, CINEMA_SLOTS, TYPE_META } from '../../utils/constants'
import { getSeenItemIds } from '../../utils/stats'

/** Les 7 prochains jours (clé ISO + label FR). */
function getCinemaDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    const key = date.toISOString().slice(0, 10)
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    return { key, label }
  })
}

/**
 * Calendrier : planification des séances (ex-Dispos, mêmes endpoints).
 * Meilleur créneau calculé côté client à partir des dispos chargées.
 */
export default function CalendarView({ currentRoom, currentRoomId, currentUser, watchlist, watched, availability, loadAvailability, showToast }) {
  const [preference, setPreference] = useState('any')
  const cinemaDays = useMemo(() => getCinemaDays(), [])

  const availabilityBySlot = useMemo(() => availability.reduce((acc, entry) => {
    const key = `${entry.day_key}|${entry.slot_key}`
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {}), [availability])

  const bestAvailability = useMemo(() => Object.entries(availabilityBySlot)
    .map(([key, entries]) => {
      const [dayKey, slotKey] = key.split('|')
      const day = cinemaDays.find(d => d.key === dayKey)
      const slot = CINEMA_SLOTS.find(s => s.key === slotKey)
      return { key, day, slot, entries }
    })
    .filter(item => item.day && item.slot)
    .sort((a, b) => b.entries.length - a.entries.length || a.day.key.localeCompare(b.day.key))
    .slice(0, 3), [availabilityBySlot, cinemaDays])

  const seenIds = useMemo(() => new Set(getSeenItemIds(watched)), [watched])
  const suggestedItem = watchlist.find(item => !seenIds.has(item.id)) || watchlist[0] || null

  async function toggleAvailability(day, slot) {
    const alreadyAvailable = availability.some(entry =>
      entry.user_id === currentUser?.id &&
      entry.day_key === day.key &&
      entry.slot_key === slot.key
    )
    try {
      await api('POST', '/auth/availability', {
        roomId: currentRoomId,
        dayKey: day.key,
        slotKey: slot.key,
        slotLabel: `${day.label} ${slot.label}`,
        preference,
        available: !alreadyAvailable,
      })
      loadAvailability()
    } catch (e) {
      showToast('Erreur dispos: ' + e.message)
    }
  }

  return (
    <>
      <div className="view-head anim-up">
        <h1>Calendrier</h1>
        <p>Planifiez les soirées de la room {currentRoom.name}</p>
      </div>

      <div className="card cal-hero anim-up-1">
        <div>
          <span className="kicker">Projecteur de groupe</span>
          <h2>{bestAvailability[0] ? `${bestAvailability[0].day.label} à ${bestAvailability[0].slot.label}` : 'Aucun créneau commun pour le moment'}</h2>
          <p>
            {bestAvailability[0]
              ? `${bestAvailability[0].entries.length} membre${bestAvailability[0].entries.length > 1 ? 's' : ''} dispo pour une ${bestAvailability[0].slot.vibe.toLowerCase()}.`
              : 'Cochez vos dispos pour faire apparaître le meilleur moment de visionnage.'}
          </p>
        </div>
        {suggestedItem && (
          <div className="cal-suggestion">
            <span>À lancer</span>
            <strong>{suggestedItem.title}</strong>
            <small>
              {(TYPE_META[suggestedItem.type] || TYPE_META.film).label}
              {suggestedItem.year ? ` · ${suggestedItem.year}` : ''}
            </small>
          </div>
        )}
      </div>

      <div className="cal-controls anim-up-2">
        <span>Mon envie du moment</span>
        {AVAILABILITY_PREFERENCES.map(([value, label]) => (
          <button key={value} className={preference === value ? 'active' : ''} onClick={() => setPreference(value)}>
            {label}
          </button>
        ))}
      </div>

      <div className="cal-grid anim-up-2">
        {cinemaDays.map(day => (
          <div key={day.key} className="cal-day">
            <div className="cal-day-title">{day.label}</div>
            {CINEMA_SLOTS.map(slot => {
              const slotEntries = availabilityBySlot[`${day.key}|${slot.key}`] || []
              const mine = slotEntries.some(entry => entry.user_id === currentUser?.id)
              return (
                <button key={slot.key} className={`cal-slot ${mine ? 'mine' : ''}`} onClick={() => toggleAvailability(day, slot)}>
                  <span>{slot.label}</span>
                  <small>{slot.vibe}</small>
                  <strong>{slotEntries.length}</strong>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="cal-board">
        <div className="card anim-up-3">
          <h2>Meilleurs créneaux</h2>
          {bestAvailability.length === 0 ? (
            <p className="cal-empty">Pas encore assez de dispos pour calculer une séance.</p>
          ) : bestAvailability.map(item => (
            <div key={item.key} className="cal-rank">
              <div>
                <strong>{item.day.label} · {item.slot.label}</strong>
                <span>{item.entries.map(entry => entry.pseudo).join(', ')}</span>
              </div>
              <b>{item.entries.length}</b>
            </div>
          ))}
        </div>
        <div className="card anim-up-4">
          <h2>Casting dispo</h2>
          {availability.length === 0 ? (
            <p className="cal-empty">Personne n'a encore coché de créneau.</p>
          ) : [...new Set(availability.map(entry => entry.pseudo))].map(pseudo => {
            const count = availability.filter(entry => entry.pseudo === pseudo).length
            return (
              <div key={pseudo} className="cal-person">
                <span>{pseudo}</span>
                <b>{count} créneau{count > 1 ? 'x' : ''}</b>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

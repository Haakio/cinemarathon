import { useEffect, useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { TOP_SIZES } from '../../utils/constants'
import PickTitleModal from '../modals/PickTitleModal'

/**
 * "Mon Top" — classement perso (top 3/5/10/15) parmi les titres de la room
 * courante. Un seul top par room, mémorisé côté serveur : indépendant des
 * notes (avis) et jamais visible par les autres membres.
 */
export default function TopView({ currentRoom, currentRoomId, watchlist, showToast }) {
  const [size, setSize] = useState(5)
  const [ranks, setRanks] = useState([]) // ids ordonnés (rang 1 en premier), sans trou
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pickerIndex, setPickerIndex] = useState(null) // rang en cours de choix, ou null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDirty(false)
    api('GET', `/auth/tops?roomId=${currentRoomId}`)
      .then(data => {
        if (cancelled) return
        setSize(data.size || 5)
        setRanks(data.itemIds || [])
      })
      .catch(e => { if (!cancelled) showToast?.(e.message || 'Impossible de charger votre top.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsById = useMemo(() => new Map(watchlist.map(item => [item.id, item])), [watchlist])
  const chosenSet = useMemo(() => new Set(ranks), [ranks])
  const available = useMemo(() => watchlist.filter(item => !chosenSet.has(item.id)), [watchlist, chosenSet])

  function changeSize(next) {
    setSize(next)
    if (ranks.length > next) setRanks(prev => prev.slice(0, next))
    setDirty(true)
  }

  function setSlot(index, itemId) {
    setRanks(prev => {
      const next = [...prev]
      if (!itemId) { next.splice(index, 1); return next }
      while (next.length <= index) next.push(null)
      next[index] = itemId
      return next.filter(Boolean)
    })
    setDirty(true)
  }

  function move(index, dir) {
    setRanks(prev => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setDirty(true)
  }

  function removeAt(index) {
    setRanks(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const data = await api('POST', '/auth/tops', { roomId: currentRoomId, size, itemIds: ranks })
      setRanks(data.itemIds)
      setDirty(false)
      showToast?.('Top enregistré 🏆')
    } catch (e) {
      showToast?.(e.message || "Impossible d'enregistrer votre top.")
    } finally {
      setSaving(false)
    }
  }

  const slots = Array.from({ length: size }, (_, i) => ranks[i] || null)

  return (
    <>
      <div className="view-head anim-up">
        <h1>Mon Top</h1>
        <p>Votre classement perso des titres de {currentRoom.name} — visible seulement par vous.</p>
      </div>

      <div className="filters anim-up-1">
        {TOP_SIZES.map(value => (
          <button key={value} className={`filter-btn ${size === value ? 'active' : ''}`} onClick={() => changeSize(value)}>
            Top {value}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><div className="icon">🏆</div><p>Chargement de votre top...</p></div>
      ) : watchlist.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏆</div>
          <p>Aucun titre dans cette room pour l'instant — ajoutez-en depuis l'onglet Administration.</p>
        </div>
      ) : (
        <>
          <div className="top-list anim-up-1">
            {slots.map((itemId, index) => {
              const item = itemId ? itemsById.get(itemId) : null
              const isLast = index === ranks.length - 1
              return (
                <div key={index} className={`top-slot ${!item ? 'top-slot-empty' : ''}`}>
                  <div className="top-rank">{index + 1}</div>
                  {item ? (
                    item.poster ? (
                      <img className="top-poster" src={item.poster} alt="" onError={e => (e.target.style.display = 'none')} />
                    ) : <div className="top-poster-ph">🎬</div>
                  ) : (
                    <div className="top-poster-ph">?</div>
                  )}
                  <div className="top-title">
                    {item ? `${item.title}${item.year ? ` (${item.year})` : ''}` : 'Choisissez un titre'}
                  </div>
                  <button
                    type="button"
                    className="top-pick-btn"
                    onClick={() => setPickerIndex(index)}
                    aria-label={`Choisir le titre au rang ${index + 1}`}
                  >
                    {item ? 'Changer' : 'Choisir un titre'}
                  </button>
                  {item && (
                    <div className="top-actions">
                      <button className="icon-btn" disabled={index === 0} onClick={() => move(index, -1)} title="Monter">↑</button>
                      <button className="icon-btn" disabled={isLast} onClick={() => move(index, 1)} title="Descendre">↓</button>
                      <button className="icon-btn" onClick={() => removeAt(index)} title="Retirer">✕</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button className="btn-primary" style={{ width: 'auto', marginTop: '18px' }} disabled={!dirty || saving} onClick={save}>
            {saving ? 'Enregistrement...' : 'Enregistrer mon top'}
          </button>
        </>
      )}

      {pickerIndex !== null && (
        <PickTitleModal
          items={available}
          onSelect={itemId => { setSlot(pickerIndex, itemId); setPickerIndex(null) }}
          onClose={() => setPickerIndex(null)}
        />
      )}
    </>
  )
}

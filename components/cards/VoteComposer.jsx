import { useEffect, useMemo, useRef, useState } from 'react'
import { TYPE_META } from '../../utils/constants'

/**
 * Composeur de vote (admin) : emplacements d'affiches avec "+",
 * recherche du film par son nom (comme la barre de recherche globale),
 * et heure de fin. Utilisé sur la vue d'ensemble et dans l'Administration.
 */
export default function VoteComposer({ watchlist, watched, onCreate }) {
  const [slots, setSlots] = useState([]) // ids des films sélectionnés (2 à 5)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [creating, setCreating] = useState(false)
  const pickerRef = useRef(null)

  const seenSet = useMemo(() => new Set(watched.map(w => w.item_id)), [watched])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return watchlist
      .filter(item => !seenSet.has(item.id) && !slots.includes(item.id))
      .filter(item => !q || item.title.toLowerCase().includes(q))
      .slice(0, 6)
  }, [watchlist, seenSet, slots, query])

  // Fermer le picker au clic extérieur
  useEffect(() => {
    function onClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const itemOf = id => watchlist.find(w => w.id === id)

  function addFilm(item) {
    if (slots.length >= 5) return
    setSlots(prev => [...prev, item.id])
    setQuery('')
    setPickerOpen(false)
  }

  function removeFilm(id) {
    setSlots(prev => prev.filter(x => x !== id))
  }

  async function submit() {
    if (slots.length < 2 || !endsAt || creating) return
    setCreating(true)
    const ok = await onCreate(slots, new Date(endsAt).toISOString())
    setCreating(false)
    if (ok) {
      setSlots([])
      setEndsAt('')
    }
  }

  return (
    <section className="card vote-composer anim-up-1">
      <h2>🗳️ Lancer un vote</h2>
      <p className="vote-hint">Choisissez 2 à 5 films, fixez l'heure de fin — les membres votent depuis la vue d'ensemble.</p>

      {/* Affiches sélectionnées + emplacement "+" */}
      <div className="vote-composer-slots">
        {slots.map(id => {
          const item = itemOf(id)
          if (!item) return null
          return (
            <div className="vote-slot" key={id} title={item.title}>
              {item.poster
                ? <img src={item.poster} alt={item.title} onError={e => { e.target.style.display = 'none' }} />
                : <div className="vote-slot-ph">{(TYPE_META[item.type] || TYPE_META.film).icon}</div>}
              <button className="vote-slot-x" onClick={() => removeFilm(id)} aria-label="Retirer">×</button>
            </div>
          )
        })}
        {slots.length < 5 && (
          <button className="vote-slot vote-slot-add" onClick={() => setPickerOpen(true)} aria-label="Ajouter un film">
            +
          </button>
        )}
      </div>

      {/* Picker : recherche par nom */}
      {pickerOpen && (
        <div className="tmdb-search" ref={pickerRef} style={{ marginTop: '10px' }}>
          <input
            className="admin-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nom du film..."
            autoFocus
          />
          <div className="tmdb-results" style={{ position: 'static', marginTop: '6px' }}>
            {results.length === 0 ? (
              <div className="search-empty">Aucun film non vu ne correspond.</div>
            ) : results.map(item => (
              <button key={item.id} className="tmdb-result" onClick={() => addFilm(item)}>
                {item.poster ? <img src={item.poster} alt="" /> : <span className="sr-ph">{(TYPE_META[item.type] || TYPE_META.film).icon}</span>}
                <span>
                  {item.title}{item.year ? ` (${item.year})` : ''}
                  <small>{(TYPE_META[item.type] || TYPE_META.film).label}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Heure de fin */}
      <div className="admin-form-group" style={{ marginTop: '14px' }}>
        <label>Fin du vote</label>
        <input
          type="datetime-local"
          className="admin-input"
          value={endsAt}
          onChange={e => setEndsAt(e.target.value)}
        />
      </div>

      <button className="btn-add" onClick={submit} disabled={creating || slots.length < 2 || !endsAt}>
        {creating ? 'Lancement...' : slots.length < 2 ? `Encore ${2 - slots.length} film${slots.length === 0 ? 's' : ''} minimum` : 'Lancer le vote'}
      </button>
    </section>
  )
}

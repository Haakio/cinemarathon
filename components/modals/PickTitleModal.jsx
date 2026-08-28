import { useMemo, useState } from 'react'
import Modal from './Modal'
import Icon from '../widgets/Icon'

/**
 * Fenêtre de sélection d'un titre avec recherche — utilisée par "Mon Top"
 * pour choisir le titre d'un rang sans dérouler une longue liste déroulante.
 */
export default function PickTitleModal({ items, onSelect, onClose }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(item => item.title.toLowerCase().includes(q))
  }, [items, query])

  return (
    <Modal onClose={onClose} className="pick-title-modal">
      <div className="modal-body">
        <span className="kicker">Mon Top</span>
        <h2 className="display" style={{ fontSize: '22px', margin: '6px 0 16px' }}>Choisir un titre</h2>

        <div className="hub-search">
          <span className="search-icon"><Icon name="search" size={14} /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un titre..."
            autoFocus
          />
        </div>

        <div className="pick-list">
          {filtered.length === 0 && (
            <div className="search-empty">
              {items.length === 0 ? 'Tous les titres sont déjà classés.' : 'Aucun titre ne correspond.'}
            </div>
          )}
          {filtered.map(item => (
            <button key={item.id} type="button" className="pick-row" onClick={() => onSelect(item.id)}>
              {item.poster
                ? <img src={item.poster} alt="" onError={e => (e.target.style.display = 'none')} />
                : <div className="top-poster-ph">🎬</div>}
              <div className="pick-row-body">
                <b>{item.title}</b>
                {item.year && <small>{item.year}</small>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

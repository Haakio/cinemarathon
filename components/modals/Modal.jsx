import { useEffect } from 'react'

/**
 * Modal de base : overlay flouté, fermeture par clic extérieur et Échap.
 * Tous les modals de l'app se composent avec celui-ci (une seule source de vérité).
 */
export default function Modal({ onClose, className = '', children, closable = true }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && closable) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, closable])

  return (
    <div className="modal-overlay" onClick={closable ? onClose : undefined}>
      <div className={`modal ${className}`} onClick={e => e.stopPropagation()}>
        {closable && <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>}
        {children}
      </div>
    </div>
  )
}

/**
 * Pile de popups de notification (bas-droite, style Discord).
 * Chaque popup s'auto-ferme (géré par le parent) et un clic ouvre
 * le centre de notifications.
 */
export default function PopupStack({ popups, onOpen, onDismiss }) {
  if (!popups.length) return null
  return (
    <div className="popup-stack">
      {popups.map(popup => (
        <div key={popup.id} className={`popup-notif ${popup.urgent ? 'urgent' : ''}`} onClick={() => onOpen?.(popup)}>
          <span className="popup-icon">{popup.icon}</span>
          <div className="popup-body">
            <b>{popup.title}</b>
            <span>{popup.text}</span>
          </div>
          <button
            className="popup-close"
            onClick={e => { e.stopPropagation(); onDismiss(popup.id) }}
            aria-label="Fermer"
          >×</button>
        </div>
      ))}
    </div>
  )
}

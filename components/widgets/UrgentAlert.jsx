/**
 * Alerte de modération plein écran (admin du site) : impossible à rater,
 * accompagnée d'un son (public/sounds/alert.mp3, à fournir).
 */
export default function UrgentAlert({ alert, onView, onDismiss }) {
  if (!alert) return null
  return (
    <div className="urgent-overlay">
      <div className="urgent-box">
        <div className="urgent-icon">⛔</div>
        <div className="urgent-title">Alerte modération</div>
        <p className="urgent-text">
          <b>{alert.pseudo}</b> vient d'être bloqué automatiquement —
          terme détecté : <b>« {alert.term} »</b> dans {alert.context || '?'}.
        </p>
        {alert.text && <div className="mod-case-text">« {alert.text} »</div>}
        <div className="urgent-actions">
          <button className="btn-danger" style={{ width: 'auto', padding: '12px 26px' }} onClick={onView}>
            Voir le dossier
          </button>
          <button className="btn-ghost" style={{ width: 'auto', marginTop: 0 }} onClick={onDismiss}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}

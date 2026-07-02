import Modal from './Modal'

/** Consentement d'activation du chat (opt-in, comportement conservé). */
export default function ChatConsentModal({ onChoose }) {
  return (
    <Modal onClose={() => onChoose(false)}>
      <div className="modal-body patch-box">
        <span className="kicker">Nouveau</span>
        <h2>Chat de room</h2>
        <p>Tu peux activer une bulle de discussion par room pour parler avec les autres membres pendant le marathon.</p>
        <div className="consent-actions">
          <button className="primary" onClick={() => onChoose(true)}>Activer</button>
          <button className="secondary" onClick={() => onChoose(false)}>Pas maintenant</button>
        </div>
      </div>
    </Modal>
  )
}

import Modal from './Modal'

/**
 * Confirmation maison (remplace window.confirm) : cohérente avec le thème,
 * variante danger pour les actions destructives.
 */
export default function ConfirmModal({ title = 'Confirmation', message, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} className="confirm-modal">
      <div className="modal-body">
        <span className="kicker">{danger ? 'Attention' : 'Confirmation'}</span>
        <h2 className="display" style={{ fontSize: '22px', margin: '6px 0 10px' }}>{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-ghost" style={{ width: 'auto', marginTop: 0 }} onClick={onCancel}>
            Annuler
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-add'}
            style={{ width: 'auto', padding: '11px 24px' }}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

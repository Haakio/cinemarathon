import Modal from './Modal'
import { patchnotes } from '../../lib/patchnotes'

/**
 * Patchnote de version (comportement conservé : fermeture différée de 5 s
 * pour être sûr que tout le monde lit les nouveautés).
 */
export default function PatchnotesModal({ closeReady, onClose }) {
  return (
    <Modal onClose={closeReady ? onClose : undefined} closable={false}>
      <div className="modal-body patch-box">
        <span className="kicker">Patchnote</span>
        <h2>{patchnotes.title}</h2>
        <p>{patchnotes.intro}</p>
        <ul>
          {patchnotes.items.map(item => <li key={item}>{item}</li>)}
        </ul>
        {!closeReady && <div className="patch-wait">Fermeture possible dans 5 secondes.</div>}
        <button onClick={onClose} disabled={!closeReady}>J'ai vu</button>
      </div>
    </Modal>
  )
}

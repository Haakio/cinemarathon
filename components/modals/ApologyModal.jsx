import Modal from './Modal'

/**
 * Mot d'excuse après les incidents du 8 au 10 août 2026.
 * Affiché UNE seule fois, et UNIQUEMENT aux comptes qui existaient déjà :
 * les inscriptions postérieures au correctif reçoivent le flag « déjà vu »
 * dès la création du compte (voir onAuthed dans pages/index.js) — inutile
 * de s'excuser auprès de quelqu'un qui n'a rien subi.
 */
export default function ApologyModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <span className="kicker">Petit mot</span>
        <h2 className="display" style={{ fontSize: '23px', margin: '6px 0 14px' }}>
          Désolé pour ces derniers jours 🙏
        </h2>

        <div className="welcome-text">
          <p>
            Le site a connu quelques ratés ces deux derniers jours, et c'était
            de mon côté — pas du vôtre :
          </p>
          <ul style={{ margin: '0 0 12px 18px', lineHeight: 1.8 }}>
            <li>L'onglet <b>Administration</b> était inaccessible dans toutes les rooms.</li>
            <li>Certains d'entre vous sont restés bloqués sur un <b>chargement infini</b>.</li>
            <li>D'autres ont été <b>déconnectés</b> sans prévenir et ont dû se reconnecter.</li>
          </ul>
          <p>
            Tout est corrigé. Au passage, votre session se prolonge maintenant
            toute seule tant que vous passez sur le site : fini les
            déconnexions surprises.
          </p>
          <p>
            Merci de votre patience — et si vous croisez encore quelque chose
            de bizarre, dites-le-moi avec le bouton <b>Retour</b> en bas à
            gauche, ou sur le Discord. Je lis tout. 🍿
          </p>
        </div>

        <button className="btn-add" style={{ marginTop: '18px' }} onClick={onClose}>
          Pas de souci !
        </button>
      </div>
    </Modal>
  )
}

import Modal from './Modal'
import Avatar from '../widgets/Avatar'
import UserTag from '../widgets/UserTag'

/**
 * Mot de bienvenue du créateur — affiché UNE seule fois, à la première
 * connexion (flag localStorage par utilisateur, géré par le parent).
 */
export default function WelcomeModal({ adminPseudo, adminAvatar, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <span className="kicker">Mot du Vibe Dev</span>

        <div className="profile-head" style={{ margin: '14px 0 18px' }}>
          <Avatar
            pseudo={adminPseudo}
            emoji={adminAvatar?.emoji || ''}
            hue={adminAvatar?.hue ?? null}
            url={adminAvatar?.url || ''}
            size={56}
          />
          <div>
            <h2 className="display" style={{ fontSize: '22px' }}>
              {adminPseudo}
              <UserTag entry={adminAvatar} />
            </h2>
            <div className="profile-sub">Créateur de Cinémarathon</div>
          </div>
        </div>

        <div className="welcome-text">
          <p>Salutations, et merci d'avoir rejoint Cinémarathon ! 🎬</p>
          <p>
            Pour commencer, transparence totale : ce site a été développé avec
            l'aide d'une IA. À la base je l'ai créé juste pour mon collègue et
            moi — et franchement, ça ne ressemblait à rien. Puis je me suis dit
            que d'autres voudraient peut-être mieux organiser leurs marathons
            et leurs soirées, alors j'ai enchaîné les mises à jour pendant un
            mois. (Et non, l'IA c'est pas « un prompt et hop, t'as le site de
            Squeezie » 😄)
          </p>
          <p>
            J'y ai mis pas mal d'heures, mais qui dit IA dit potentiellement
            plus de bugs que la normale. Si quelque chose cloche — ou s'il vous
            manque un truc — dites-le-moi via le bouton <b>Retour</b> en bas à
            gauche. Je lis tout.
          </p>
          <p>Bon marathon ! 🍿</p>
        </div>

        <button className="btn-add" style={{ marginTop: '18px' }} onClick={onClose}>
          C'est parti !
        </button>
      </div>
    </Modal>
  )
}

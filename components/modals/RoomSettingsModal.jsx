import Modal from './Modal'

/**
 * Réglages de la room courante (créateur / admin du site) :
 * photo, code d'accès, membres. Ouvert via le bouton "Gérer" de la
 * barre des rooms — séparé du panneau rejoindre/créer pour rester intuitif.
 */
export default function RoomSettingsModal({
  currentRoom, onClose,
  manageImage, setManageImage, onSaveImage,
  manageCode, setManageCode, onSaveCode,
  roomMembers, onKickMember,
  roomMsg,
}) {
  const isMarvel = currentRoom.id === 'marvel'

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <span className="kicker">Réglages</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 18px' }}>
          Gérer {currentRoom.name}
        </h2>

        <h4 className="profile-section-title">Photo de la room</h4>
        <div className="room-code-row">
          <input value={manageImage} onChange={e => setManageImage(e.target.value)}
            placeholder="https://... (lien direct vers une image)" onKeyDown={e => e.key === 'Enter' && onSaveImage()} />
          <button onClick={onSaveImage}>Enregistrer</button>
        </div>
        {manageImage && /^https:\/\//i.test(manageImage) && (
          <img src={manageImage} alt="aperçu"
            style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', marginTop: '10px', border: '1px solid var(--border)' }}
            onError={e => { e.target.style.display = 'none' }} />
        )}
        <div className="tmdb-hint">Affichée dans le hub des salles et la barre latérale.</div>

        {!isMarvel && (
          <>
            <h4 className="profile-section-title">Code d'accès</h4>
            <div className="room-code-row">
              <input type="password" value={manageCode} onChange={e => setManageCode(e.target.value)}
                placeholder="Nouveau code d'accès" onKeyDown={e => e.key === 'Enter' && onSaveCode()} />
              <button onClick={onSaveCode}>Mettre à jour</button>
            </div>
            <div className="tmdb-hint">Les membres actuels restent — seuls les nouveaux arrivants utilisent le nouveau code.</div>
          </>
        )}

        <h4 className="profile-section-title">Membres</h4>
        {roomMembers.length ? roomMembers.map(member => (
          <div className="room-member-row" key={member.user_id}>
            <span>
              {member.pseudo || 'Membre'}
              {member.user_id === currentRoom.created_by ? ' — créateur' : member.role === 'admin' ? ' — admin' : ''}
            </span>
            {!isMarvel && member.user_id !== currentRoom.created_by && (
              <button onClick={() => onKickMember(member)}>Retirer</button>
            )}
          </div>
        )) : <div className="room-member-empty">Aucun membre à afficher.</div>}

        {roomMsg && <div className="room-msg" style={{ marginTop: '12px' }}>{roomMsg}</div>}
      </div>
    </Modal>
  )
}

import Modal from './Modal'

/**
 * Panneau room : rejoindre / créer une salle privée, gérer le code et les
 * membres. Toute la logique reste dans le parent (mêmes appels API qu'avant),
 * ce composant est purement présentationnel.
 */
export default function RoomModal({
  mode, onSetMode, onClose,
  joinName, setJoinName, joinCode, setJoinCode, onJoin,
  newName, setNewName, newCode, setNewCode, onCreate,
  isGlobalAdmin = false, newIsPublic = false, setNewIsPublic,
  canDeleteCurrentRoom, currentRoom,
  manageCode, setManageCode, onSaveCode,
  manageImage, setManageImage, onSaveImage,
  roomMembers, onKickMember,
  roomMsg,
}) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <span className="kicker">Ticket d'entrée</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 18px' }}>
          {mode === 'join' ? 'Rejoindre une room' : 'Créer une room'}
        </h2>

        <div className="room-gate-tabs">
          <button className={mode === 'join' ? 'active' : ''} onClick={() => onSetMode('join')}>Rejoindre</button>
          <button className={mode === 'create' ? 'active' : ''} onClick={() => onSetMode('create')}>Créer</button>
        </div>

        {mode === 'join' ? (
          <div className="room-gate-form">
            <label>Nom de la room</label>
            <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="SpiderVerse" />
            <label>Code d'accès</label>
            <input type="password" value={joinCode} onChange={e => setJoinCode(e.target.value)}
              placeholder="Code donné par l'hôte" onKeyDown={e => e.key === 'Enter' && onJoin()} />
            <button onClick={onJoin}>Entrer dans la salle</button>
          </div>
        ) : (
          <div className="room-gate-form">
            <label>Nom de la room</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Marathon perso" />
            {isGlobalAdmin && (
              <label className="settings-row" style={{ marginBottom: 0 }}>
                <span>
                  <strong>Room publique</strong>
                  <small>Visible par tous dans le hub, sans code d'accès</small>
                </span>
                <input type="checkbox" checked={newIsPublic} onChange={e => setNewIsPublic(e.target.checked)} />
              </label>
            )}
            {!newIsPublic && (
              <>
                <label>Code d'accès</label>
                <input type="password" value={newCode} onChange={e => setNewCode(e.target.value)}
                  placeholder="À donner aux invités" onKeyDown={e => e.key === 'Enter' && onCreate()} />
              </>
            )}
            <button onClick={onCreate}>Créer la salle</button>
          </div>
        )}

        {canDeleteCurrentRoom && (
          <div className="room-code-box">
            <div className="room-code-title">Code de {currentRoom.name}</div>
            <div className="room-code-row">
              <input type="password" value={manageCode} onChange={e => setManageCode(e.target.value)}
                placeholder="Nouveau code d'accès" onKeyDown={e => e.key === 'Enter' && onSaveCode()} />
              <button onClick={onSaveCode}>Mettre à jour</button>
            </div>
          </div>
        )}

        {canDeleteCurrentRoom && (
          <div className="room-code-box">
            <div className="room-code-title">Photo de {currentRoom.name}</div>
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
          </div>
        )}

        {canDeleteCurrentRoom && (
          <div className="room-members-box">
            <div className="room-code-title">Membres</div>
            {roomMembers.length ? roomMembers.map(member => (
              <div className="room-member-row" key={member.user_id}>
                <span>{member.pseudo || 'Membre'}{member.user_id === currentRoom.created_by ? ' — créateur' : ''}</span>
                {member.user_id !== currentRoom.created_by && (
                  <button onClick={() => onKickMember(member)}>Retirer</button>
                )}
              </div>
            )) : <div className="room-member-empty">Aucun membre à afficher.</div>}
          </div>
        )}

        {roomMsg && <div className="room-msg" style={{ marginTop: '12px' }}>{roomMsg}</div>}
      </div>
    </Modal>
  )
}

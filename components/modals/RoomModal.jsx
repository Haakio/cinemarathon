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
  copySource = null,
  roomMsg,
}) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <span className="kicker">Ticket d'entrée</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 18px' }}>
          {copySource ? 'Copier en room privée' : mode === 'join' ? 'Rejoindre une room' : 'Créer une room'}
        </h2>

        {copySource ? (
          <p className="room-copy-note">
            La liste de <b>{copySource.name}</b> (films, ordre, fiches) sera
            recopiée dans votre nouvelle room privée. Progression, avis et
            discussions repartent à zéro — invitez vos potes avec le code.
          </p>
        ) : (
          <div className="room-gate-tabs">
            <button className={mode === 'join' ? 'active' : ''} onClick={() => onSetMode('join')}>Rejoindre</button>
            <button className={mode === 'create' ? 'active' : ''} onClick={() => onSetMode('create')}>Créer</button>
          </div>
        )}

        {mode === 'join' && !copySource ? (
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
            {isGlobalAdmin && !copySource && (
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
            <button onClick={onCreate}>{copySource ? 'Copier la room' : 'Créer la salle'}</button>
          </div>
        )}

        {roomMsg && <div className="room-msg" style={{ marginTop: '12px' }}>{roomMsg}</div>}
      </div>
    </Modal>
  )
}

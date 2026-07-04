import Icon from '../widgets/Icon'

/**
 * Barre des rooms, version épurée : un switcher (ouvre le hub de toutes
 * les salles) + la room courante uniquement. Les actions sur la room
 * courante (supprimer / quitter) restent à portée de main.
 */
export default function RoomBar({
  currentRoom, onOpenHub,
  canDeleteCurrentRoom, onDeleteRoom, onLeaveRoom,
  roomMsg,
}) {
  return (
    <div className="room-bar">
      <div className="room-list">
        <button className="room-switcher" onClick={onOpenHub} title="Toutes les rooms">
          <Icon name="door" size={16} />
          <span>Salles</span>
        </button>
        {/* Simple indicateur de la room courante — non cliquable */}
        <div className="current-room-label">
          <span className="current-room-dot" />
          {currentRoom.name}
        </div>
      </div>
      <div className="room-actions">
        {canDeleteCurrentRoom && (
          <button className="room-delete-btn" onClick={onDeleteRoom}>Supprimer</button>
        )}
        {currentRoom.id !== 'marvel' && !canDeleteCurrentRoom && (
          <button className="room-leave-btn" onClick={onLeaveRoom}>Quitter</button>
        )}
      </div>
      {roomMsg && <div className="room-msg">{roomMsg}</div>}
    </div>
  )
}

/**
 * Barre des rooms : pills de sélection + actions (supprimer / quitter / créer).
 * La logique (API) reste dans le parent ; ce composant est purement présentationnel.
 */
export default function RoomBar({
  rooms, currentRoomId, onSelectRoom,
  canDeleteCurrentRoom, onDeleteRoom, onLeaveRoom, onOpenRoomPanel,
  roomMsg,
}) {
  const list = rooms.length ? rooms : [{ id: 'marvel', name: 'Marvel' }]

  return (
    <div className="room-bar">
      <div className="room-list">
        {list.map(room => (
          <button
            key={room.id}
            className={`room-btn ${currentRoomId === room.id ? 'active' : ''}`}
            onClick={() => onSelectRoom(room.id)}
          >
            {room.name}
          </button>
        ))}
      </div>
      <div className="room-actions">
        {canDeleteCurrentRoom && (
          <button className="room-delete-btn" onClick={onDeleteRoom}>Supprimer</button>
        )}
        {currentRoomId !== 'marvel' && !canDeleteCurrentRoom && (
          <button className="room-leave-btn" onClick={onLeaveRoom}>Quitter</button>
        )}
        <button className="room-gate-toggle" onClick={onOpenRoomPanel}>+ Salle privée</button>
      </div>
      {roomMsg && <div className="room-msg">{roomMsg}</div>}
    </div>
  )
}

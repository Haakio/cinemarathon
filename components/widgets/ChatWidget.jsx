import Avatar from './Avatar'
import UserTag from './UserTag'
import ModBadge from './ModBadge'
import { formatTime } from '../../utils/format'

/**
 * Widget chat flottant. Le SYSTÈME est inchangé (mêmes endpoints, même
 * polling via useChat) — seule l'apparence a été retravaillée.
 */
export default function ChatWidget({ chat, currentRoom, currentUser, avatarMap = {} }) {
  const {
    chatEnabled, chatOpen, setChatOpen,
    chatMessages, chatInput, setChatInput, chatTypingUsers,
    chatMessagesRef, sendChatMessage,
  } = chat

  // Chat désactivé dans les paramètres : la bulle disparaît complètement
  // (réactivable via Profil → Paramètres).
  if (!chatEnabled) return null

  return (
    <div className="chat-widget">
      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-head">
            <div>
              <div className="chat-title">Chat de la room</div>
              <div className="chat-room">{currentRoom.name}</div>
            </div>
            <div className="chat-head-actions">
              <button onClick={() => setChatOpen(false)} aria-label="Fermer">×</button>
            </div>
          </div>

          <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.length === 0 ? (
                  <div className="chat-empty">Aucun message dans cette room.</div>
                ) : chatMessages.map(msg => {
                  const mine = msg.user_id === currentUser?.id
                  const custom = avatarMap[msg.user_id] || avatarMap[(msg.pseudo || '').toLowerCase()] || {}
                  return (
                    <div key={msg.id} className={`chat-message ${mine ? 'mine' : ''}`}>
                      <div className="chat-meta">
                        <span>{msg.pseudo || 'Membre'}<ModBadge entry={custom} /><UserTag entry={custom} /></span>
                        <small>{formatTime(msg.created_at)}</small>
                      </div>
                      <div className="chat-line">
                        {!mine && (
                          <Avatar pseudo={msg.pseudo} emoji={custom.emoji || ''} hue={custom.hue ?? null} url={custom.url || ''} size={24} />
                        )}
                        <div className="chat-bubble-text">{msg.message}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={`chat-typing ${chatTypingUsers.length ? 'show' : ''}`}>
                {chatTypingUsers.length ? `${chatTypingUsers[0].pseudo} écrit` : ''}
                <span>.</span><span>.</span><span>.</span>
              </div>
              <div className="chat-compose">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Écrire un message..."
                  maxLength={500}
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                />
                <button onClick={sendChatMessage}>➤</button>
              </div>
        </div>
      )}
      <button className="chat-bubble" onClick={() => setChatOpen(!chatOpen)}>
        💬 Chat
      </button>
    </div>
  )
}

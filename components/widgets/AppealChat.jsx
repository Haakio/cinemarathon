import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../utils/api'
import { formatTime } from '../../utils/format'

/**
 * Chat du canal d'appel — utilisé des deux côtés :
 * - écran bloqué (targetUserId absent → sa propre conversation)
 * - Panel Modération (targetUserId = le compte suspendu)
 * Poll 8s tant que le chat est affiché.
 */
export default function AppealChat({ targetUserId = null, placeholder = 'Votre message...' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : ''
      const data = await api('GET', `/auth/appeal${query}`)
      setMessages(data.messages || [])
    } catch { }
  }, [targetUserId])

  useEffect(() => {
    load()
    const timer = setInterval(() => { if (!document.hidden) load() }, 8000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await api('POST', '/auth/appeal', { message: text, userId: targetUserId })
      setInput('')
      await load()
    } catch { }
    setSending(false)
  }

  return (
    <div className="appeal-chat">
      <div className="appeal-messages">
        {messages.length === 0 ? (
          <div className="appeal-empty">
            {targetUserId ? 'Aucun message pour le moment.' : 'Expliquez-vous ici — la modération vous lira.'}
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`appeal-msg ${msg.from_admin ? 'from-admin' : 'from-user'}`}>
            <div className="appeal-msg-meta">
              {msg.from_admin ? '🛡️ Modération' : msg.pseudo} · {formatTime(msg.created_at)}
            </div>
            <div className="appeal-msg-text">{msg.message}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="appeal-compose">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send} disabled={sending || !input.trim()}>➤</button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { api } from '../../utils/api'

/** Widget retour (idée / bug / avis) — même endpoint qu'avant. */
export default function FeedbackWidget({ currentRoom, showToast }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('Idée')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    const text = message.trim()
    if (!text) {
      showToast('Écris ton retour avant d\'envoyer.')
      return
    }
    setLoading(true)
    try {
      await api('POST', '/auth/feedback', { type, message: text, roomName: currentRoom.name })
      setMessage('')
      setOpen(false)
      showToast('Retour envoyé, merci !')
    } catch (e) {
      showToast('Erreur retour: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="feedback-widget">
      {open && (
        <div className="feedback-panel">
          <div className="feedback-head">
            <div>
              <div className="feedback-title">Retour</div>
              <div className="feedback-subtitle">Avis, bug ou idée d'ajout</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer">×</button>
          </div>
          <div className="feedback-body">
            <div className="feedback-types">
              {['Idée', 'Bug', 'Avis'].map(t => (
                <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={1500}
              placeholder="Dis ce que tu penses du site, ce qu'il manque, ou ce qui bug..."
            />
            <div className="feedback-foot">
              <span>{message.length}/1500</span>
              <button onClick={send} disabled={loading}>{loading ? 'Envoi...' : 'Envoyer'}</button>
            </div>
          </div>
        </div>
      )}
      <button className="feedback-bubble" onClick={() => setOpen(!open)}>Retour</button>
    </div>
  )
}

import { createChatMessage, getChatMessages } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      const messages = await getChatMessages(roomId)
      return res.status(200).json(messages)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', message } = req.body
    const text = (message || '').trim()
    if (!text) return res.status(400).json({ error: 'Message requis' })
    if (text.length > 500) return res.status(400).json({ error: 'Message trop long' })

    try {
      const chatMessage = {
        id: uid(),
        roomId,
        userId: user.id,
        pseudo: user.pseudo,
        text,
      }
      await createChatMessage(chatMessage)
      return res.status(201).json({ ok: true, message: chatMessage })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

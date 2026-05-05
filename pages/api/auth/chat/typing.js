import { getChatTyping, hasRoomAccess, setChatTyping } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      const typing = await getChatTyping(roomId, user.id)
      return res.status(200).json(typing)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', isTyping = false } = req.body
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      await setChatTyping({
        roomId,
        userId: user.id,
        pseudo: user.pseudo,
        isTyping: Boolean(isTyping),
      })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

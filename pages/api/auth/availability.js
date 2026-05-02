import { getAvailability, setAvailability } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      const entries = await getAvailability(roomId)
      return res.status(200).json(entries)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', dayKey, slotKey, slotLabel, preference = 'any', available = true } = req.body
    if (!dayKey || !slotKey || !slotLabel) return res.status(400).json({ error: 'Creneau requis' })

    try {
      const saved = await setAvailability({
        roomId,
        userId: user.id,
        pseudo: user.pseudo,
        dayKey,
        slotKey,
        slotLabel,
        preference,
        available,
      })
      if (!saved) return res.status(503).json({ error: 'Disponibilites pas encore initialisees. Relancez le setup.' })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

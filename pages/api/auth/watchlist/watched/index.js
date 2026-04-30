import { getWatched, upsertWatched } from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'GET') {
    try {
      const entries = await getWatched()
      return res.status(200).json(entries)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { itemId, rating, comment } = req.body
    if (!itemId || !rating) return res.status(400).json({ error: 'itemId et rating requis' })
    try {
      const entry = {
        id: uid(),
        itemId,
        userId: user.id,
        pseudo: user.pseudo,
        rating: parseInt(rating),
        comment: comment || '',
      }
      await upsertWatched(entry)
      return res.status(200).json({ ok: true, entry })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}
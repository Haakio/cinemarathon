import { getWatched, upsertWatched, deleteWatched } from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      const entries = await getWatched(roomId)
      return res.status(200).json(entries)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', itemId, rating, comment } = req.body
    if (!itemId || !rating) return res.status(400).json({ error: 'itemId et rating requis' })
    try {
      const entry = {
        id: uid(),
        roomId,
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

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id requis' })

    try {
      const entries = await getWatched()
      const entry = entries.find(e => e.id === id)

      if (!entry) return res.status(404).json({ error: 'Avis introuvable' })

      const isOwner = entry.user_id === user.id
      const isAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Interdit' })
      }

      await deleteWatched(id)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

import { getUserById, getWatched, getWatchedEntry, getHiddenRatingUserIds, hasRoomAccess, upsertWatched, deleteWatched } from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { moderateOrBlock, rejectIfSuspended } from '../../../../../lib/guard'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      const entries = await getWatched(roomId)
      const hiddenUserIds = await getHiddenRatingUserIds(roomId)
      const visible = entries.filter(e => e.user_id === user.id || !hiddenUserIds.has(e.user_id))
      return res.status(200).json(visible)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', itemId, rating, comment } = req.body
    if (!itemId || !rating) return res.status(400).json({ error: 'itemId et rating requis' })
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      // Modération du commentaire d'avis
      if (await rejectIfSuspended(res, user)) return
      if (comment && await moderateOrBlock(res, user, [comment], 'avis')) return
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
      const entry = await getWatchedEntry(id)
      if (!entry) return res.status(404).json({ error: 'Avis introuvable' })
      // Sécurité : vérifier l'accès sur la room RÉELLE de l'avis, jamais sur
      // un roomId envoyé par le client.
      if (!await hasRoomAccess(entry.room_id || 'marvel', user.id)) return res.status(403).json({ error: 'Room privee' })

      const isOwner = entry.user_id === user.id
      const isAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)
      // Les modérateurs du site peuvent supprimer n'importe quel avis
      let isModerator = false
      if (!isOwner && !isAdmin) {
        const requester = await getUserById(user.id)
        isModerator = Boolean(requester?.moderator)
      }
      if (!isOwner && !isAdmin && !isModerator) {
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

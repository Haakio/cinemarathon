import { getUserTop, hasRoomAccess, upsertUserTop } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { TOP_SIZES } from '../../../utils/constants'

/**
 * "Mon Top" — classement perso (3/5/10/15) parmi les titres d'une room,
 * un top par (user, room). GET renvoie le top courant (vide par défaut),
 * POST l'enregistre en entier (pas de patch incrémental).
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privée' })
      const top = await getUserTop(user.id, roomId)
      if (!top) return res.status(200).json({ size: 5, itemIds: [] })
      let itemIds = []
      try { itemIds = JSON.parse(top.item_ids || '[]') } catch { itemIds = [] }
      return res.status(200).json({ size: top.size, itemIds })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', size, itemIds } = req.body
    if (!TOP_SIZES.includes(size)) return res.status(400).json({ error: 'Taille de top invalide' })
    if (!Array.isArray(itemIds) || itemIds.some(id => typeof id !== 'string')) {
      return res.status(400).json({ error: 'Liste invalide' })
    }
    const trimmed = itemIds.slice(0, size)
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privée' })
      await upsertUserTop({ userId: user.id, roomId, size, itemIds: JSON.stringify(trimmed) })
      return res.status(200).json({ size, itemIds: trimmed })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

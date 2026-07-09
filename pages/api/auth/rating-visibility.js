import { getRatingVisibility, setHideRatingsPublic, setRoomRatingHidden } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Préférences de confidentialité de mes notes/avis.
 * GET  → { hidePublic, hiddenRoomIds }
 * POST { scope: 'public'|'room', roomId?, hidden } → met à jour une préférence
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    if (req.method === 'GET') {
      const prefs = await getRatingVisibility(user.id)
      return res.status(200).json(prefs)
    }

    if (req.method === 'POST') {
      const { scope, roomId, hidden } = req.body
      if (scope === 'public') {
        await setHideRatingsPublic(user.id, Boolean(hidden))
      } else if (scope === 'room') {
        if (!roomId) return res.status(400).json({ error: 'roomId requis' })
        await setRoomRatingHidden(user.id, roomId, Boolean(hidden))
      } else {
        return res.status(400).json({ error: 'scope invalide' })
      }
      const prefs = await getRatingVisibility(user.id)
      return res.status(200).json(prefs)
    }

    return res.status(405).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

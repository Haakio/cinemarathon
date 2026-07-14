import { getUserWatchedAcrossRooms } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Toutes mes notes, toutes rooms confondues — pour la vue "Mes notes"
 * (évite de changer de room pour retrouver un avis).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    const entries = await getUserWatchedAcrossRooms(user.id)
    return res.status(200).json(entries)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

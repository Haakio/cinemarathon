import { getUsersActivity } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Suivi d'activité des comptes — ADMIN GLOBAL uniquement.
 * GET → [{ id, pseudo, created_at, last_seen_at, blocked, banned, room_count }]
 *
 * Ne renvoie QUE des métadonnées d'activité : aucun contenu privé (messages,
 * avis, rooms) et pas d'adresse IP — la politique de confidentialité limite
 * l'usage de l'IP à la lutte contre les abus (voir pupitre de Bannissement).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  if (!adminPseudo || user.pseudo !== adminPseudo) {
    return res.status(403).json({ error: 'Réservé à l\'admin du site' })
  }

  try {
    const users = await getUsersActivity()
    return res.status(200).json(users)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

import { deleteUserAccount } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Suppression de compte — SELF-SERVICE (obligation légale).
 * POST { confirm } — confirm doit être exactement mon propre pseudo
 * (double sécurité contre les clics accidentels, même UX que l'outil admin).
 * L'admin du site ne peut pas se supprimer depuis cette page.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  if (adminPseudo && user.pseudo === adminPseudo) {
    return res.status(403).json({ error: 'L\'administrateur du site ne peut pas supprimer son propre compte ici. Contactez un développeur.' })
  }

  const { confirm } = req.body
  if (confirm !== user.pseudo) {
    return res.status(400).json({ error: 'Confirmation invalide (retapez votre pseudo exact)' })
  }

  try {
    await deleteUserAccount(user.id)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

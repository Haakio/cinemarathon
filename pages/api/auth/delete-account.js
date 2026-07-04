import { deleteUserAccount, getUser } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Suppression de compte — RÉSERVÉ À L'ADMIN DU SITE.
 * POST { pseudo, confirm } — confirm doit être exactement le pseudo
 * (double sécurité contre les clics accidentels).
 * L'admin ne peut pas supprimer son propre compte.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  if (!adminPseudo || user.pseudo !== adminPseudo) {
    return res.status(403).json({ error: 'Réservé à l\'administrateur du site' })
  }

  const { pseudo, confirm } = req.body
  if (!pseudo?.trim()) return res.status(400).json({ error: 'Pseudo requis' })
  if (confirm !== pseudo.trim()) {
    return res.status(400).json({ error: 'Confirmation invalide (retapez le pseudo exact)' })
  }

  try {
    const target = await getUser(pseudo.trim())
    if (!target) return res.status(404).json({ error: 'Aucun compte avec ce pseudo' })
    if (target.id === user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
    }

    await deleteUserAccount(target.id)
    return res.status(200).json({ ok: true, pseudo: target.pseudo })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

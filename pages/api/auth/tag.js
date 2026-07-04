import { getUser, updateUserTag } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { TAG_COLORS } from '../../../utils/constants'

/**
 * Attribution de tags — RÉSERVÉ À L'ADMIN DU SITE.
 * POST { pseudo, label, color } — label vide = retirer le tag.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  if (!adminPseudo || user.pseudo !== adminPseudo) {
    return res.status(403).json({ error: 'Réservé à l\'administrateur du site' })
  }

  const { pseudo, label, color } = req.body
  if (!pseudo?.trim()) return res.status(400).json({ error: 'Pseudo requis' })

  const cleanLabel = String(label || '').trim().slice(0, 20)
  const cleanColor = cleanLabel ? (TAG_COLORS[color] ? color : 'gold') : ''

  try {
    const target = await getUser(pseudo.trim())
    if (!target) return res.status(404).json({ error: 'Aucun compte avec ce pseudo' })
    await updateUserTag(target.id, cleanLabel, cleanColor)
    return res.status(200).json({ ok: true, pseudo: target.pseudo, label: cleanLabel, color: cleanColor })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { getUser, upsertPasswordReset } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Génération d'un code de réinitialisation — ADMIN GLOBAL uniquement.
 * POST { pseudo } → { code } (affiché une seule fois, stocké haché, expire en 30 min).
 */

/** Code lisible type "K7XQ-M2P9" (sans caractères ambigus). */
function generateCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length]
    if (i === 3) code += '-'
  }
  return code
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  if (!adminPseudo || user.pseudo !== adminPseudo) {
    return res.status(403).json({ error: 'Réservé à l\'administrateur du site' })
  }

  const { pseudo } = req.body
  if (!pseudo?.trim()) return res.status(400).json({ error: 'Pseudo requis' })

  try {
    const target = await getUser(pseudo.trim())
    if (!target) return res.status(404).json({ error: 'Aucun compte avec ce pseudo' })

    const code = generateCode()
    // On hache la forme normalisée (sans tiret) : l'utilisateur peut taper
    // le code avec ou sans tiret, en minuscules ou majuscules.
    const codeHash = await bcrypt.hash(code.replace(/[^A-Z0-9]/g, ''), 10)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await upsertPasswordReset(target.id, codeHash, expiresAt)

    // Le code en clair n'est renvoyé qu'ici, une seule fois.
    return res.status(200).json({ code, pseudo: target.pseudo, expiresInMinutes: 30 })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

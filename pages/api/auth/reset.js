import bcrypt from 'bcryptjs'
import { deletePasswordReset, getPasswordReset, getUser, updateUserPassword } from '../../../lib/db'
import { signToken } from '../../../lib/auth'

/**
 * Réinitialisation du mot de passe avec un code fourni par l'admin.
 * POST { pseudo, code, newPassword } → { token, user } (connexion directe).
 * Le code est à usage unique et expire 30 min après sa génération.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pseudo, code, newPassword } = req.body
  if (!pseudo?.trim() || !code?.trim() || !newPassword) {
    return res.status(400).json({ error: 'Champs manquants' })
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' })
  }

  try {
    const user = await getUser(pseudo.trim())
    // Message volontairement identique pour ne pas révéler quels pseudos existent
    const invalid = () => res.status(401).json({ error: 'Code invalide ou expiré' })
    if (!user) return invalid()

    const reset = await getPasswordReset(user.id)
    if (!reset) return invalid()
    if (new Date(reset.expires_at) < new Date()) {
      await deletePasswordReset(user.id)
      return invalid()
    }

    // Normalisation identique à la génération (majuscules, sans tiret/espaces)
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const codeOk = await bcrypt.compare(normalizedCode, reset.code_hash)
    if (!codeOk) return invalid()

    const hashed = await bcrypt.hash(newPassword, 10)
    await updateUserPassword(user.id, hashed)
    await deletePasswordReset(user.id) // usage unique

    // Connexion immédiate après réinitialisation
    const token = signToken({ id: user.id, pseudo: user.pseudo })
    return res.status(200).json({ token, user: { id: user.id, pseudo: user.pseudo } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

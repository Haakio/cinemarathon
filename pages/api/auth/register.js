import bcrypt from 'bcryptjs'
import { addUserToPublicRooms, getUser, createUser, isIpBanned } from '../../../lib/db'
import { signToken } from '../../../lib/auth'
import { checkForbidden } from '../../../lib/moderation'
import { getClientIp } from '../../../lib/guard'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { pseudo, password, acceptTerms } = req.body
  if (!pseudo || !password) return res.status(400).json({ error: 'Champs manquants' })
  if (pseudo.trim().length < 2) return res.status(400).json({ error: 'Pseudo trop court (min 2 caractères)' })
  if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' })
  if (acceptTerms !== true) return res.status(400).json({ error: 'Vous devez accepter les CGU et confirmer avoir au moins 16 ans.' })

  // Pseudo haineux refusé d'entrée (sans création de compte)
  if (checkForbidden(pseudo)) {
    return res.status(400).json({ error: 'Ce pseudo n\'est pas autorisé.' })
  }

  try {
    // IP bannie → pas de nouveau compte
    if (await isIpBanned(getClientIp(req))) {
      return res.status(403).json({ error: 'Inscription impossible depuis cet appareil.' })
    }

    const existing = await getUser(pseudo.trim())
    if (existing) return res.status(409).json({ error: 'Ce pseudo est déjà pris' })
    const hashed = await bcrypt.hash(password, 10)
    const id = uid()
    await createUser(id, pseudo.trim(), hashed)
    // Membre automatique de toutes les rooms publiques (non bloquant)
    try { await addUserToPublicRooms(id) } catch { }
    const token = signToken({ id, pseudo: pseudo.trim() })
    return res.status(201).json({ token, user: { id, pseudo: pseudo.trim() } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
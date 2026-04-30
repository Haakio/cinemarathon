import bcrypt from 'bcryptjs'
import { getUser, createUser } from '../../../lib/db'
import { signToken } from '../../../lib/auth'
import { v4 as uuidv4 } from 'crypto'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { pseudo, password } = req.body
  if (!pseudo || !password) return res.status(400).json({ error: 'Champs manquants' })
  if (pseudo.trim().length < 2) return res.status(400).json({ error: 'Pseudo trop court (min 2 caractères)' })
  if (password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' })

  try {
    const existing = await getUser(pseudo.trim())
    if (existing) return res.status(409).json({ error: 'Ce pseudo est déjà pris' })
    const hashed = await bcrypt.hash(password, 10)
    const id = uid()
    await createUser(id, pseudo.trim(), hashed)
    const token = signToken({ id, pseudo: pseudo.trim() })
    return res.status(201).json({ token, user: { id, pseudo: pseudo.trim() } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
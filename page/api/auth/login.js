import bcrypt from 'bcryptjs'
import { getUser } from '../../../lib/db'
import { signToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { pseudo, password } = req.body
  if (!pseudo || !password) return res.status(400).json({ error: 'Champs manquants' })

  try {
    const user = await getUser(pseudo.trim())
    if (!user) return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' })
    const token = signToken({ id: user.id, pseudo: user.pseudo })
    return res.status(200).json({ token, user: { id: user.id, pseudo: user.pseudo } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
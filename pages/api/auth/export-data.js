import { getUserDataExport } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Portabilité RGPD : renvoie toutes les données personnelles de l'utilisateur
 * connecté sous forme de JSON téléchargeable.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    const data = await getUserDataExport(user.id)
    res.setHeader('Content-Disposition', `attachment; filename="cinemarathon-${user.pseudo}.json"`)
    return res.status(200).json(data)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

import { getCustomAvatars } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Avatars personnalisés de tous les membres.
 * Chargé UNE fois par session (avec profil + amis), puis utilisé par toutes
 * les vues (membres, classement...) — aucune requête supplémentaire ensuite.
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const rows = await getCustomAvatars()
    return res.status(200).json({
      avatars: rows.map(row => ({
        userId: row.id,
        pseudo: row.pseudo,
        emoji: row.avatar_emoji || '',
        hue: row.avatar_hue ?? null,
        url: row.avatar_url || '',
        tagLabel: row.tag_label || '',
        tagColor: row.tag_color || '',
        moderator: Boolean(row.moderator),
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

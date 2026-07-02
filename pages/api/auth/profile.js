import { getUserById, searchUsers, updateUserAvatar } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { AVATAR_EMOJIS } from '../../../utils/constants'

/**
 * Profil utilisateur.
 * GET               → mon profil (avatar inclus)
 * GET ?search=xx    → recherche de membres par pseudo (pour les demandes d'amis)
 * POST {avatarEmoji, avatarHue} → mise à jour de mon avatar
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    if (req.method === 'GET') {
      if (req.query.search) {
        const results = await searchUsers(String(req.query.search).trim(), user.id)
        return res.status(200).json({ results })
      }
      const me = await getUserById(user.id)
      if (!me) return res.status(404).json({ error: 'Compte introuvable' })
      return res.status(200).json({
        id: me.id,
        pseudo: me.pseudo,
        createdAt: me.created_at,
        avatarEmoji: me.avatar_emoji || '',
        avatarHue: me.avatar_hue ?? null,
        avatarUrl: me.avatar_url || '',
      })
    }

    if (req.method === 'POST') {
      const { avatarEmoji, avatarHue, avatarUrl } = req.body
      if (avatarEmoji && !AVATAR_EMOJIS.includes(avatarEmoji)) {
        return res.status(400).json({ error: 'Emoji non autorisé' })
      }
      const url = (avatarUrl || '').trim()
      const isHttpsUrl = /^https:\/\//i.test(url) && url.length <= 500
      const isDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url) && url.length <= 250000
      if (url && !isHttpsUrl && !isDataImage) {
        return res.status(400).json({ error: 'Image invalide (lien https ou image importée trop lourde)' })
      }
      const hue = avatarHue === null || avatarHue === undefined ? null : Math.max(0, Math.min(359, parseInt(avatarHue, 10) || 0))
      await updateUserAvatar(user.id, avatarEmoji || '', hue, url)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

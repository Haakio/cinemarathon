import { createFilmPost, deleteFilmPost, getFilmPost, getFilmPosts, getUserById, hasRoomAccess } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { moderateOrBlock, rejectIfSuspended } from '../../../lib/guard'

function uid() { return Math.random().toString(36).substr(2, 12) }

/**
 * Discussions par film (style forum).
 * GET    ?roomId=            → posts + réponses de la room (chargé à l'ouverture de la vue)
 * POST   {roomId, itemId?, parentId?, title?, body} → nouveau post ou réponse
 * DELETE {id, roomId}        → suppression (auteur ou admin global)
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    if (req.method === 'GET') {
      const { roomId = 'marvel' } = req.query
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      const rows = await getFilmPosts(roomId)

      // Dédoublonnage des avatars : envoyés une seule fois par membre
      // (un avatar importé en base64 peut peser 100+ Ko — pas question de
      // le répéter sur chacun de ses posts).
      const avatars = {}
      const posts = rows.map(row => {
        const { avatar_emoji, avatar_hue, avatar_url, tag_label, tag_color, ...post } = row
        if (!(post.user_id in avatars)) {
          avatars[post.user_id] = {
            emoji: avatar_emoji || '',
            hue: avatar_hue ?? null,
            url: avatar_url || '',
            tagLabel: tag_label || '',
            tagColor: tag_color || '',
          }
        }
        return post
      })
      return res.status(200).json({ posts, avatars })
    }

    if (req.method === 'POST') {
      const { roomId = 'marvel', itemId, parentId, title, body, image } = req.body
      if (!body?.trim() && !image) return res.status(400).json({ error: 'Le message est vide' })
      if (body && body.length > 3000) return res.status(400).json({ error: 'Message trop long (max 3000)' })
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })

      // Image jointe : URL https (GIF Tenor...) ou upload compressé en base64
      const img = String(image || '').trim()
      const isHttpsImg = /^https:\/\//i.test(img) && img.length <= 500
      const isDataImg = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(img) && img.length <= 250000
      if (img && !isHttpsImg && !isDataImg) {
        return res.status(400).json({ error: 'Image invalide (lien https ou fichier trop lourd)' })
      }

      // Modération : compte suspendu → refus ; propos haineux → blocage
      if (await rejectIfSuspended(res, user)) return
      if (await moderateOrBlock(res, user, [title, body], 'discussion')) return

      const post = {
        id: uid(),
        roomId,
        itemId: itemId || null,
        parentId: parentId || null,
        userId: user.id,
        pseudo: user.pseudo,
        title: (title || '').trim().slice(0, 140),
        body: (body || '').trim(),
        image: img,
      }
      await createFilmPost(post)
      return res.status(201).json({ ok: true, post })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id requis' })

      const post = await getFilmPost(id)
      if (!post) return res.status(404).json({ error: 'Post introuvable' })
      // Sécurité : vérifier l'accès sur la room RÉELLE du post, jamais sur un
      // roomId envoyé par le client.
      if (!await hasRoomAccess(post.room_id, user.id)) return res.status(403).json({ error: 'Room privee' })

      const isOwner = post.user_id === user.id
      const isAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)
      // Les modérateurs du site peuvent supprimer n'importe quel message
      let isModerator = false
      if (!isOwner && !isAdmin) {
        const requester = await getUserById(user.id)
        isModerator = Boolean(requester?.moderator)
      }
      if (!isOwner && !isAdmin && !isModerator) return res.status(403).json({ error: 'Interdit' })

      await deleteFilmPost(id) // supprime aussi les réponses
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

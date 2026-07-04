import { acceptFriendRequest, createFriendRequest, deleteFriendship, getFriendship, getFriendships, getRoomInvitesFor, getUser } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Système d'amis.
 * GET  → { friends, incoming, outgoing } (une seule requête, chargé 1x/session)
 * POST { action: 'request', pseudo }         → envoyer une demande
 * POST { action: 'accept',  targetUserId }   → accepter
 * POST { action: 'decline', targetUserId }   → refuser / annuler
 * POST { action: 'remove',  targetUserId }   → retirer un ami
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    if (req.method === 'GET') {
      const rows = await getFriendships(user.id)
      const shape = row => {
        const otherIsRequester = row.addressee_id === user.id
        const side = otherIsRequester ? 'requester' : 'addressee'
        return {
          userId: row[`${side}_id`],
          pseudo: row[`${side}_pseudo`],
          avatarEmoji: row[`${side}_avatar_emoji`] || '',
          avatarHue: row[`${side}_avatar_hue`] ?? null,
          avatarUrl: row[`${side}_avatar_url`] || '',
          since: row.created_at,
        }
      }
      // Les invitations de room voyagent avec la même requête de session
      const roomInvites = await getRoomInvitesFor(user.id)
      return res.status(200).json({
        friends: rows.filter(r => r.status === 'accepted').map(shape),
        incoming: rows.filter(r => r.status === 'pending' && r.addressee_id === user.id).map(shape),
        outgoing: rows.filter(r => r.status === 'pending' && r.requester_id === user.id).map(shape),
        roomInvites: roomInvites.map(invite => ({
          roomId: invite.room_id,
          roomName: invite.room_name || 'Room',
          fromPseudo: invite.from_pseudo || 'Un membre',
          since: invite.created_at,
        })),
      })
    }

    if (req.method === 'POST') {
      const { action, pseudo, targetUserId } = req.body

      if (action === 'request') {
        if (!pseudo?.trim()) return res.status(400).json({ error: 'Pseudo requis' })
        const target = await getUser(pseudo.trim())
        if (!target) return res.status(404).json({ error: 'Aucun compte avec ce pseudo' })
        if (target.id === user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même' })

        const existing = await getFriendship(user.id, target.id)
        if (existing?.status === 'accepted') return res.status(409).json({ error: 'Vous êtes déjà amis' })
        if (existing?.status === 'pending') {
          // Si l'autre m'avait déjà demandé, on accepte directement
          if (existing.requester_id === target.id) {
            await acceptFriendRequest(target.id, user.id)
            return res.status(200).json({ ok: true, accepted: true })
          }
          return res.status(409).json({ error: 'Demande déjà envoyée' })
        }

        await createFriendRequest(user.id, target.id)
        return res.status(201).json({ ok: true })
      }

      if (!targetUserId) return res.status(400).json({ error: 'Membre requis' })

      if (action === 'accept') {
        const existing = await getFriendship(user.id, targetUserId)
        // Seul le destinataire d'une demande pending peut accepter
        if (!existing || existing.status !== 'pending' || existing.addressee_id !== user.id) {
          return res.status(404).json({ error: 'Demande introuvable' })
        }
        await acceptFriendRequest(existing.requester_id, existing.addressee_id)
        return res.status(200).json({ ok: true })
      }

      if (action === 'decline' || action === 'remove') {
        await deleteFriendship(user.id, targetUserId)
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Action inconnue' })
    }

    return res.status(405).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

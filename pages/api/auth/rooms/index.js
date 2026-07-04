import bcrypt from 'bcryptjs'
import {
  addRoomMember, createRoom, createRoomInvite, deleteRoom, deleteRoomInvite,
  getFriendship, getPublicRooms, getRoomById, getRoomByInviteToken, getRoomByName,
  getRoomInvitesFor, getRoomInviteToken, getRoomMembers, getRooms, hasRoomAccess,
  removeRoomMember, setRoomInviteToken, setRoomMemberRole, updateRoomCode,
} from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })

  if (req.method === 'GET') {
    try {
      // Hub de découverte : rooms publiques (1 requête à l'ouverture du hub)
      if (req.query.discover) {
        const publicRooms = await getPublicRooms()
        return res.status(200).json(publicRooms)
      }

      if (req.query.membersRoomId) {
        const roomId = String(req.query.membersRoomId)
        if (!(await hasRoomAccess(roomId, user.id))) return res.status(403).json({ error: 'Acces refuse' })
        const members = await getRoomMembers(roomId)
        return res.status(200).json(members)
      }

      const rooms = await getRooms(user.id)
      return res.status(200).json(rooms)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { action = 'create', name, code, roomId, targetUserId } = req.body

    try {
      if (action === 'leave') {
        if (!roomId) return res.status(400).json({ error: 'Room requise' })
        if (roomId === 'marvel') return res.status(400).json({ error: 'Impossible de quitter Marvel' })

        const room = await getRoomById(roomId)
        if (!room) return res.status(404).json({ error: 'Room introuvable' })
        if (room.created_by === user.id) return res.status(400).json({ error: 'Le createur doit supprimer la room' })
        if (!(await hasRoomAccess(roomId, user.id))) return res.status(403).json({ error: 'Acces refuse' })

        await removeRoomMember(roomId, user.id)
        return res.status(200).json({ ok: true })
      }

      if (action === 'kick') {
        if (!roomId || !targetUserId) return res.status(400).json({ error: 'Membre requis' })
        if (roomId === 'marvel') return res.status(400).json({ error: 'Impossible de modifier Marvel' })

        const room = await getRoomById(roomId)
        if (!room) return res.status(404).json({ error: 'Room introuvable' })

        const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
        const canKick = room.created_by === user.id || (adminPseudo && user.pseudo === adminPseudo)
        if (!canKick) return res.status(403).json({ error: 'Seul le createur peut retirer un membre' })
        if (targetUserId === room.created_by) return res.status(400).json({ error: 'Impossible de retirer le createur' })

        await removeRoomMember(roomId, targetUserId)
        return res.status(200).json({ ok: true })
      }

      if (action === 'setRole') {
        if (!roomId || !targetUserId) return res.status(400).json({ error: 'Membre requis' })
        if (!['member', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Role invalide' })
        if (roomId === 'marvel') return res.status(400).json({ error: 'Impossible de modifier Marvel' })

        const room = await getRoomById(roomId)
        if (!room) return res.status(404).json({ error: 'Room introuvable' })

        const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
        const canSetRole = room.created_by === user.id || (adminPseudo && user.pseudo === adminPseudo)
        if (!canSetRole) return res.status(403).json({ error: 'Seul le createur peut gerer les admins' })
        if (targetUserId === room.created_by) return res.status(400).json({ error: 'Le createur reste owner' })

        await setRoomMemberRole(roomId, targetUserId, req.body.role)
        return res.status(200).json({ ok: true })
      }

      if (action === 'inviteLink') {
        // Lien d'invitation : token stable par room, généré à la demande
        if (!roomId) return res.status(400).json({ error: 'Room requise' })
        if (!(await hasRoomAccess(roomId, user.id))) return res.status(403).json({ error: 'Acces refuse' })
        let token = await getRoomInviteToken(roomId)
        if (!token) {
          token = uid() + uid()
          await setRoomInviteToken(roomId, token)
        }
        return res.status(200).json({ token })
      }

      if (action === 'joinInvite') {
        // Rejoindre via un lien d'invitation (aucun code nécessaire)
        const { token } = req.body
        if (!token?.trim()) return res.status(400).json({ error: 'Invitation invalide' })
        const room = await getRoomByInviteToken(token.trim())
        if (!room) return res.status(404).json({ error: 'Invitation invalide ou expirée' })
        await addRoomMember(room.id, user.id, 'member')
        return res.status(200).json(room)
      }

      if (action === 'inviteFriend') {
        // Invitation directe d'un ami du site (notification chez lui)
        if (!roomId || !targetUserId) return res.status(400).json({ error: 'Ami requis' })
        if (!(await hasRoomAccess(roomId, user.id))) return res.status(403).json({ error: 'Acces refuse' })
        const friendship = await getFriendship(user.id, targetUserId)
        if (!friendship || friendship.status !== 'accepted') {
          return res.status(403).json({ error: 'Vous devez être amis pour l\'inviter' })
        }
        if (await hasRoomAccess(roomId, targetUserId)) {
          return res.status(409).json({ error: 'Déjà membre de cette room' })
        }
        await createRoomInvite({ roomId, toUserId: targetUserId, fromUserId: user.id, fromPseudo: user.pseudo })
        return res.status(201).json({ ok: true })
      }

      if (action === 'acceptInvite') {
        if (!roomId) return res.status(400).json({ error: 'Room requise' })
        const invites = await getRoomInvitesFor(user.id)
        if (!invites.some(invite => invite.room_id === roomId)) {
          return res.status(404).json({ error: 'Invitation introuvable' })
        }
        await addRoomMember(roomId, user.id, 'member')
        await deleteRoomInvite(roomId, user.id)
        const room = await getRoomById(roomId)
        return res.status(200).json(room)
      }

      if (action === 'declineInvite') {
        if (!roomId) return res.status(400).json({ error: 'Room requise' })
        await deleteRoomInvite(roomId, user.id)
        return res.status(200).json({ ok: true })
      }

      if (action === 'joinPublic') {
        // Rejoindre une room publique depuis le hub — sans code
        if (!roomId) return res.status(400).json({ error: 'Room requise' })
        const room = await getRoomById(roomId)
        if (!room) return res.status(404).json({ error: 'Room introuvable' })
        if (room.is_private !== false && room.id !== 'marvel') {
          return res.status(403).json({ error: 'Cette room est privée (code requis)' })
        }
        await addRoomMember(room.id, user.id, 'member')
        return res.status(200).json(room)
      }

      if (action === 'join') {
        if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })
        if (!code?.trim()) return res.status(400).json({ error: 'Code requis' })
        const room = await getRoomByName(name.trim())
        if (!room) return res.status(404).json({ error: 'Room introuvable' })
        if (room.id !== 'marvel') {
          if (!room.join_code_hash) return res.status(403).json({ error: 'Cette room ne peut pas etre rejointe par code' })
          const ok = await bcrypt.compare(code.trim(), room.join_code_hash)
          if (!ok) return res.status(403).json({ error: 'Code incorrect' })
        }
        await addRoomMember(room.id, user.id, 'member')
        return res.status(200).json(room)
      }

      // Création de room. Publique = réservée à l'admin du site, sans code.
      const isPublic = Boolean(req.body.isPublic)
      const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
      if (isPublic && (!adminPseudo || user.pseudo !== adminPseudo)) {
        return res.status(403).json({ error: 'Seul l\'admin du site peut créer des rooms publiques' })
      }

      if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })
      if (!isPublic && (!code?.trim() || code.trim().length < 3)) {
        return res.status(400).json({ error: 'Code requis (min 3 caracteres)' })
      }

      const joinCodeHash = isPublic ? null : await bcrypt.hash(code.trim(), 10)
      const room = {
        id: uid(),
        name: name.trim(),
        slug: `${slugify(name.trim()) || 'room'}-${Date.now().toString(36)}`,
        createdBy: user.id,
        joinCodeHash,
        isPublic,
      }
      await createRoom(room)
      return res.status(201).json({ id: room.id, name: room.name, slug: room.slug, created_by: room.createdBy, can_delete: true, can_manage: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'DELETE') {
    const { roomId } = req.body || {}
    if (!roomId) return res.status(400).json({ error: 'Room requise' })
    if (roomId === 'marvel') return res.status(400).json({ error: 'La room Marvel ne peut pas etre supprimee' })

    try {
      const room = await getRoomById(roomId)
      if (!room) return res.status(404).json({ error: 'Room introuvable' })

      const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
      const canDelete = room.created_by === user.id || (adminPseudo && user.pseudo === adminPseudo)
      if (!canDelete) return res.status(403).json({ error: 'Seul le createur peut supprimer cette room' })

      await deleteRoom(roomId)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'PATCH') {
    const { roomId, code } = req.body || {}
    if (!roomId) return res.status(400).json({ error: 'Room requise' })
    if (roomId === 'marvel') return res.status(400).json({ error: 'La room Marvel reste publique' })
    if (!code?.trim() || code.trim().length < 3) {
      return res.status(400).json({ error: 'Code requis (min 3 caracteres)' })
    }

    try {
      const room = await getRoomById(roomId)
      if (!room) return res.status(404).json({ error: 'Room introuvable' })

      const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
      const canUpdate = room.created_by === user.id || (adminPseudo && user.pseudo === adminPseudo)
      if (!canUpdate) return res.status(403).json({ error: 'Seul le createur peut changer le code' })

      const joinCodeHash = await bcrypt.hash(code.trim(), 10)
      await updateRoomCode(roomId, joinCodeHash)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

import bcrypt from 'bcryptjs'
import { addRoomMember, createRoom, getRoomByName, getRooms } from '../../../../lib/db'
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
      const rooms = await getRooms(user.id)
      return res.status(200).json(rooms)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { action = 'create', name, code } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })

    try {
      if (action === 'join') {
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

      if (!code?.trim() || code.trim().length < 3) {
        return res.status(400).json({ error: 'Code requis (min 3 caracteres)' })
      }

      const joinCodeHash = await bcrypt.hash(code.trim(), 10)
      const room = {
        id: uid(),
        name: name.trim(),
        slug: `${slugify(name.trim()) || 'room'}-${Date.now().toString(36)}`,
        createdBy: user.id,
        joinCodeHash,
      }
      await createRoom(room)
      return res.status(201).json({ id: room.id, name: room.name, slug: room.slug, created_by: room.createdBy })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

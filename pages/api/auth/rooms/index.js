import { createRoom, getRooms } from '../../../../lib/db'
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
      const rooms = await getRooms()
      return res.status(200).json(rooms)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })

    try {
      const room = {
        id: uid(),
        name: name.trim(),
        slug: `${slugify(name.trim()) || 'room'}-${Date.now().toString(36)}`,
        createdBy: user.id,
      }
      await createRoom(room)
      return res.status(201).json(room)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

import { deleteWatchlistItem, getWatchlist, updateWatchlistOrder, updateWatchlistItem } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })
  const { id } = req.query

  if (req.method === 'DELETE') {
    try {
      await deleteWatchlistItem(id)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // PUT: swap order with neighbor (dir: 1 or -1)
  if (req.method === 'PUT') {
  const { roomId = 'marvel', dir, title, type, poster, year } = req.body

  try {
    // ✏️ MODE MODIFICATION
    if (title || type || poster !== undefined || year !== undefined) {
      const isAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)
      if (!isAdmin) {
        return res.status(403).json({ error: 'Interdit' })
      }

      if (!title || !type) {
        return res.status(400).json({ error: 'Titre et type requis' })
      }

      await updateWatchlistItem(id, {
        title: title.trim(),
        type,
        poster: poster || '',
        year: year || ''
      })

      return res.status(200).json({ ok: true })
    }

    // 🔁 MODE DEPLACEMENT (TON CODE ACTUEL)
    const items = await getWatchlist(roomId)
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0) return res.status(404).json({ error: 'Introuvable' })

    const target = idx + dir
    if (target < 0 || target >= items.length) {
      return res.status(400).json({ error: 'Impossible' })
    }

    const aOrder = items[idx].order
    const bOrder = items[target].order

    await updateWatchlistOrder(items[idx].id, bOrder)
    await updateWatchlistOrder(items[target].id, aOrder)

    return res.status(200).json({ ok: true })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

  return res.status(405).end()
}

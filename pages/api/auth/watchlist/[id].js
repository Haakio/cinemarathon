import { deleteWatchlistItem, getWatchlist, hasRoomAccess, hasRoomManageAccess, updateWatchlistOrder, updateWatchlistItem } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

function isValidWatchUrl(url) { return !url || /^https?:\/\//i.test(url) }

async function canManage(roomId, user) {
  const isGlobalAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)
  return isGlobalAdmin || await hasRoomManageAccess(roomId, user.id)
}

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })
  const { id } = req.query

  if (req.method === 'DELETE') {
    const { roomId = 'marvel' } = req.body || {}
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      if (!await canManage(roomId, user)) return res.status(403).json({ error: 'Interdit' })
      await deleteWatchlistItem(id)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'PUT') {
    const { roomId = 'marvel', dir, title, type, poster, year, platform, watchUrl, synopsis, runtime, genres, tmdbId, backdrop, cast, releaseDate } = req.body

    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      if (!await canManage(roomId, user)) return res.status(403).json({ error: 'Interdit' })

      if (title || type || poster !== undefined || year !== undefined || platform !== undefined || watchUrl !== undefined) {
        if (!title || !type) return res.status(400).json({ error: 'Titre et type requis' })
        if (!isValidWatchUrl(watchUrl)) return res.status(400).json({ error: 'Lien de visionnage invalide' })

        await updateWatchlistItem(id, {
          title: title.trim(),
          type,
          poster: poster || '',
          year: year || '',
          platform: platform?.trim() || '',
          watchUrl: watchUrl?.trim() || '',
          // Métadonnées TMDB (tmdbId défini => tentative de mise à jour étendue)
          synopsis: synopsis || '',
          runtime: parseInt(runtime, 10) || 0,
          genres: genres || '',
          tmdbId: tmdbId !== undefined ? String(tmdbId || '') : undefined,
          backdrop: backdrop || '',
          castJson: Array.isArray(cast) ? JSON.stringify(cast.slice(0, 10)) : '[]',
          releaseDate: releaseDate || '',
        })

        return res.status(200).json({ ok: true })
      }

      const items = await getWatchlist(roomId)
      const idx = items.findIndex(i => i.id === id)
      if (idx < 0) return res.status(404).json({ error: 'Introuvable' })

      const target = idx + dir
      if (target < 0 || target >= items.length) return res.status(400).json({ error: 'Impossible' })

      await updateWatchlistOrder(items[idx].id, items[target].order)
      await updateWatchlistOrder(items[target].id, items[idx].order)

      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

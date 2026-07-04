import { getWatchlist, hasRoomAccess, hasRoomManageAccess, insertWatchlistItem } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }
function isValidWatchUrl(url) { return !url || /^https?:\/\//i.test(url) }

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  if (req.method === 'GET') {
    const { roomId = 'marvel' } = req.query
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      const items = await getWatchlist(roomId)
      return res.status(200).json(items)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { roomId = 'marvel', title, type, poster, year, platform, watchUrl, synopsis, runtime, genres, tmdbId, backdrop, cast, releaseDate } = req.body
    if (!title || !type) return res.status(400).json({ error: 'Titre et type requis' })
    if (!isValidWatchUrl(watchUrl)) return res.status(400).json({ error: 'Lien de visionnage invalide' })
    try {
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })
      const isGlobalAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)
      if (!isGlobalAdmin && !await hasRoomManageAccess(roomId, user.id)) return res.status(403).json({ error: 'Interdit' })
      const items = await getWatchlist(roomId)
      const item = {
        id: uid(),
        roomId,
        title: title.trim(),
        type,
        poster: poster || '',
        year: year || '',
        platform: platform?.trim() || '',
        watchUrl: watchUrl?.trim() || '',
        order: items.length + 1,
        addedBy: user.id,
        // Métadonnées TMDB (optionnelles, rétrocompatibles)
        synopsis: synopsis || '',
        runtime: parseInt(runtime, 10) || 0,
        genres: genres || '',
        tmdbId: tmdbId ? String(tmdbId) : '',
        backdrop: backdrop || '',
        castJson: Array.isArray(cast) ? JSON.stringify(cast.slice(0, 10)) : '[]',
        releaseDate: releaseDate || '',
      }
      await insertWatchlistItem(item)
      return res.status(201).json(item)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

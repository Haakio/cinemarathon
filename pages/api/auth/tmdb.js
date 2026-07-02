import { searchTmdb, getTmdbDetails } from '../../../lib/tmdb'
import { requireAuth } from '../../../lib/auth'

/**
 * Proxy TMDB authentifié.
 * GET ?query=avengers            → recherche multi (films + séries)
 * GET ?mediaType=movie&tmdbId=24 → détails complets d'un titre
 * Aucun appel Neon : uniquement TMDB, la clé reste côté serveur.
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })
  if (req.method !== 'GET') return res.status(405).end()

  const { query, mediaType, tmdbId } = req.query

  try {
    if (query) {
      const results = await searchTmdb(String(query).trim())
      return res.status(200).json({ results })
    }

    if (mediaType && tmdbId) {
      if (!['movie', 'tv'].includes(mediaType)) return res.status(400).json({ error: 'mediaType invalide' })
      const details = await getTmdbDetails(mediaType, tmdbId)
      return res.status(200).json({ details })
    }

    return res.status(400).json({ error: 'Paramètres manquants (query ou mediaType+tmdbId)' })
  } catch (err) {
    console.error(err)
    return res.status(502).json({ error: err.message || 'Erreur TMDB' })
  }
}

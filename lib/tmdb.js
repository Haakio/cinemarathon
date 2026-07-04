/**
 * Client TMDB côté serveur.
 * La clé API (TMDB_API_KEY) ne quitte jamais le serveur : le frontend passe
 * par /api/auth/tmdb qui proxifie ces fonctions.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

function getApiKey() {
  return process.env.TMDB_API_KEY || ''
}

async function tmdbFetch(path, params = {}) {
  const key = getApiKey()
  if (!key) throw new Error('TMDB_API_KEY manquante (variable d\'environnement Vercel)')
  const query = new URLSearchParams({ api_key: key, language: 'fr-FR', ...params })
  const res = await fetch(`${TMDB_BASE}${path}?${query}`)
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

function posterUrl(path, size = 'w500') {
  return path ? `${IMAGE_BASE}/${size}${path}` : ''
}

/**
 * Recherche multi (films + séries).
 * @returns {Promise<Array<{tmdbId: number, mediaType: 'movie'|'tv', title: string, year: string, poster: string, overview: string}>>}
 */
export async function searchTmdb(query) {
  const data = await tmdbFetch('/search/multi', { query, include_adult: 'false' })
  return (data.results || [])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 8)
    .map(r => ({
      tmdbId: r.id,
      mediaType: r.media_type,
      title: r.title || r.name || '',
      year: String(r.release_date || r.first_air_date || '').slice(0, 4),
      poster: posterUrl(r.poster_path, 'w185'),
      overview: r.overview || '',
    }))
}

/**
 * Détails complets d'un titre (synopsis, durée, genres, casting, images).
 * Pour les séries, la durée est le total estimé (épisodes × durée moyenne).
 * @param {'movie'|'tv'} mediaType
 * @param {number|string} tmdbId
 */
export async function getTmdbDetails(mediaType, tmdbId) {
  const data = await tmdbFetch(`/${mediaType}/${tmdbId}`, { append_to_response: 'credits' })

  let runtime = 0
  if (mediaType === 'movie') {
    runtime = data.runtime || 0
  } else {
    const perEpisode = Array.isArray(data.episode_run_time) && data.episode_run_time.length
      ? data.episode_run_time[0]
      : 42
    runtime = (data.number_of_episodes || 0) * perEpisode
  }

  const cast = (data.credits?.cast || []).slice(0, 10).map(actor => ({
    name: actor.name,
    character: actor.character || '',
    photo: actor.profile_path ? posterUrl(actor.profile_path, 'w185') : '',
  }))

  return {
    tmdbId: data.id,
    mediaType,
    title: data.title || data.name || '',
    year: String(data.release_date || data.first_air_date || '').slice(0, 4),
    releaseDate: String(data.release_date || data.first_air_date || '').slice(0, 10),
    poster: posterUrl(data.poster_path, 'w500'),
    backdrop: posterUrl(data.backdrop_path, 'w1280'),
    synopsis: data.overview || '',
    runtime,
    genres: (data.genres || []).map(g => g.name).join(', '),
    cast,
    episodes: mediaType === 'tv' ? data.number_of_episodes || 0 : null,
  }
}

/**
 * Moteur de données dérivées.
 * Toutes les fonctions sont PURES : elles recalculent stats, classement,
 * activité et membres à partir des données déjà chargées (watchlist, watched,
 * availability, chat) — aucune requête SQL supplémentaire n'est nécessaire.
 */
import { TYPE_META, XP_RULES } from './constants'

/** IDs distincts des titres vus par au moins un membre. */
export function getSeenItemIds(watched) {
  return [...new Set(watched.map(w => w.item_id))]
}

/** Durée d'un titre en minutes (TMDB si dispo, sinon estimation par type). */
export function getRuntime(item) {
  const runtime = parseInt(item?.runtime, 10)
  if (runtime > 0) return runtime
  return (TYPE_META[item?.type] || TYPE_META.film).fallbackRuntime
}

/**
 * Progression globale du marathon.
 * @returns {{seen: number, total: number, percent: number, films: number, series: number,
 *   animes: number, remaining: number, remainingMinutes: number, watchedMinutes: number}}
 */
export function getProgress(watchlist, watched) {
  const seenIds = getSeenItemIds(watched)
  const seenSet = new Set(seenIds)
  const total = watchlist.length
  const seen = watchlist.filter(item => seenSet.has(item.id)).length
  const remainingItems = watchlist.filter(item => !seenSet.has(item.id))
  return {
    seen,
    total,
    percent: total > 0 ? Math.round((seen / total) * 100) : 0,
    films: watchlist.filter(i => i.type === 'film').length,
    series: watchlist.filter(i => i.type === 'serie').length,
    animes: watchlist.filter(i => i.type === 'anime').length,
    remaining: total - seen,
    remainingMinutes: remainingItems.reduce((sum, item) => sum + getRuntime(item), 0),
    watchedMinutes: watchlist.filter(i => seenSet.has(i.id)).reduce((sum, item) => sum + getRuntime(item), 0),
  }
}

/** Prochain titre non vu (dans l'ordre du marathon). */
export function getNextItem(watchlist, watched) {
  const seenSet = new Set(getSeenItemIds(watched))
  return watchlist.find(item => !seenSet.has(item.id)) || null
}

/**
 * Membres de la room, dérivés des traces d'activité (avis, dispos, chat)
 * et de la liste officielle si disponible. Progression individuelle incluse.
 */
export function buildMembers({ watchlist, watched, availability = [], chatMessages = [], roomMembers = [], currentUser = null }) {
  /** @type {Map<string, {pseudo: string, userId: string|null, lastActive: number, role: string|null}>} */
  const map = new Map()
  const touch = (pseudo, userId, timestamp, role) => {
    if (!pseudo) return
    const key = pseudo.toLowerCase()
    const existing = map.get(key) || { pseudo, userId: null, lastActive: 0, role: null }
    if (userId) existing.userId = userId
    if (role) existing.role = role
    const time = timestamp ? new Date(timestamp).getTime() : 0
    if (time > existing.lastActive) existing.lastActive = time
    map.set(key, existing)
  }

  // last_seen_at = heartbeat de présence (poll rooms) — la vraie source du statut "en ligne"
  roomMembers.forEach(m => touch(m.pseudo, m.user_id, m.last_seen_at || m.joined_at, m.role))
  watched.forEach(w => touch(w.pseudo, w.user_id, w.watched_at))
  availability.forEach(a => touch(a.pseudo, a.user_id, a.updated_at))
  chatMessages.forEach(m => touch(m.pseudo, m.user_id, m.created_at))
  if (currentUser) touch(currentUser.pseudo, currentUser.id, Date.now())

  const total = watchlist.length
  return [...map.values()]
    .map(member => {
      const memberSeen = new Set(
        watched
          .filter(w => (member.userId && w.user_id === member.userId) || (w.pseudo || '').toLowerCase() === member.pseudo.toLowerCase())
          .map(w => w.item_id)
      ).size
      return {
        ...member,
        seen: memberSeen,
        percent: total > 0 ? Math.round((memberSeen / total) * 100) : 0,
        isMe: currentUser && (member.userId === currentUser.id || member.pseudo.toLowerCase() === currentUser.pseudo.toLowerCase()),
        online: Date.now() - member.lastActive < 5 * 60 * 1000,
      }
    })
    .sort((a, b) => b.seen - a.seen || a.pseudo.localeCompare(b.pseudo))
}

/**
 * Flux d'activité (timeline), dérivé des avis et des dispos.
 * @returns {Array<{id: string, type: string, icon: string, pseudo: string, text: string, at: string}>}
 */
export function buildActivity({ watchlist, watched, availability = [] }, limit = 14) {
  const titleOf = itemId => watchlist.find(i => i.id === itemId)?.title || 'un titre'
  const events = []

  watched.forEach(entry => {
    events.push({
      id: `watch-${entry.id}`,
      type: entry.comment ? 'comment' : 'watch',
      icon: entry.comment ? '💬' : '✓',
      pseudo: entry.pseudo || 'Membre',
      text: `a noté ${titleOf(entry.item_id)} ${entry.rating}/10`,
      at: entry.watched_at,
    })
  })

  availability.forEach(entry => {
    events.push({
      id: `avail-${entry.user_id}-${entry.day_key}-${entry.slot_key}`,
      type: 'availability',
      icon: '📅',
      pseudo: entry.pseudo || 'Membre',
      text: `est dispo le ${entry.slot_label}`,
      at: entry.updated_at,
    })
  })

  return events
    .filter(e => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)
}

/**
 * Classement des membres : films vus, note moyenne, commentaires, XP.
 */
export function buildLeaderboard({ watchlist, watched }) {
  /** @type {Map<string, {pseudo: string, userId: string, seen: Set<string>, ratings: number[], comments: number}>} */
  const map = new Map()
  watched.forEach(entry => {
    const key = (entry.pseudo || entry.user_id || '?').toLowerCase()
    const row = map.get(key) || { pseudo: entry.pseudo || 'Membre', userId: entry.user_id, seen: new Set(), ratings: [], comments: 0 }
    row.seen.add(entry.item_id)
    if (entry.rating) row.ratings.push(entry.rating)
    if (entry.comment) row.comments += 1
    map.set(key, row)
  })

  const total = watchlist.length
  return [...map.values()]
    .map(row => {
      const seen = row.seen.size
      const avg = row.ratings.length ? row.ratings.reduce((a, b) => a + b, 0) / row.ratings.length : 0
      const xp = seen * XP_RULES.perWatch + row.comments * XP_RULES.perComment + row.ratings.length * XP_RULES.perRating
      return {
        pseudo: row.pseudo,
        userId: row.userId,
        seen,
        percent: total > 0 ? Math.round((seen / total) * 100) : 0,
        avgRating: Math.round(avg * 10) / 10,
        comments: row.comments,
        xp,
      }
    })
    .sort((a, b) => b.xp - a.xp || b.seen - a.seen)
}

/** Répartition par genre (métadonnées TMDB "Action, Aventure" sur chaque titre). */
export function getGenreBreakdown(watchlist) {
  const counts = new Map()
  watchlist.forEach(item => {
    String(item.genres || '')
      .split(',')
      .map(g => g.trim())
      .filter(Boolean)
      .forEach(genre => counts.set(genre, (counts.get(genre) || 0) + 1))
  })
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

/** Distribution des notes (1-10) tous membres confondus. */
export function getRatingDistribution(watched) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: 0 }))
  watched.forEach(entry => {
    const r = parseInt(entry.rating, 10)
    if (r >= 1 && r <= 10) buckets[r - 1].count += 1
  })
  return buckets
}

/** Progression cumulée dans le temps (titres distincts vus par date). */
export function getProgressTimeline(watchlist, watched) {
  const firstSeenByItem = new Map()
  watched.forEach(entry => {
    const time = new Date(entry.watched_at).getTime()
    if (!firstSeenByItem.has(entry.item_id) || time < firstSeenByItem.get(entry.item_id)) {
      firstSeenByItem.set(entry.item_id, time)
    }
  })
  const points = [...firstSeenByItem.values()]
    .sort((a, b) => a - b)
    .map((time, index) => ({ time, count: index + 1 }))
  return { points, total: watchlist.length }
}

/** Moyenne des notes pour un titre donné. */
export function getItemRating(watched, itemId) {
  const ratings = watched.filter(w => w.item_id === itemId && w.rating).map(w => w.rating)
  if (!ratings.length) return null
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
}

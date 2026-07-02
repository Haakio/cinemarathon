/**
 * Architecture des badges (gamification).
 * Les badges sont calculés côté client à partir des données déjà chargées :
 * aucun stockage serveur nécessaire pour l'instant. Le jour où l'on veut les
 * persister (notifications de déblocage, historique), il suffira d'ajouter
 * une table `user_badges` et de synchroniser `computeBadges`.
 *
 * @typedef {object} BadgeContext
 * @property {number} seen        Titres distincts vus par le membre
 * @property {number} total       Taille de la watchlist
 * @property {number} comments    Nombre de commentaires laissés
 * @property {number} ratings     Nombre de notes données
 * @property {number} perfectTens Nombre de 10/10 donnés
 * @property {number} chatCount   Messages de chat envoyés
 * @property {number} availabilityCount Créneaux de dispo cochés
 */

/** @type {Array<{id: string, icon: string, name: string, description: string, check: (ctx: BadgeContext) => boolean}>} */
export const BADGES = [
  {
    id: 'first-blood',
    icon: '🎬',
    name: 'Premier clap',
    description: 'Voir son premier titre du marathon.',
    check: ctx => ctx.seen >= 1,
  },
  {
    id: 'five-pack',
    icon: '🍿',
    name: 'Popcorn chaud',
    description: 'Voir 5 titres.',
    check: ctx => ctx.seen >= 5,
  },
  {
    id: 'ten-pack',
    icon: '🔥',
    name: 'Enchaînement',
    description: 'Voir 10 titres.',
    check: ctx => ctx.seen >= 10,
  },
  {
    id: 'halfway',
    icon: '⏳',
    name: 'Mi-parcours',
    description: 'Atteindre 50% du marathon.',
    check: ctx => ctx.total > 0 && ctx.seen / ctx.total >= 0.5,
  },
  {
    id: 'finisher',
    icon: '🏆',
    name: 'Marathonien',
    description: 'Terminer 100% du marathon.',
    check: ctx => ctx.total > 0 && ctx.seen >= ctx.total,
  },
  {
    id: 'critic',
    icon: '✍️',
    name: 'Critique',
    description: 'Laisser 5 commentaires.',
    check: ctx => ctx.comments >= 5,
  },
  {
    id: 'generous',
    icon: '💛',
    name: 'Cœur d\'or',
    description: 'Donner trois 10/10.',
    check: ctx => ctx.perfectTens >= 3,
  },
  {
    id: 'planner',
    icon: '📅',
    name: 'Organisateur',
    description: 'Cocher 5 créneaux de dispo.',
    check: ctx => ctx.availabilityCount >= 5,
  },
]

/**
 * Calcule le contexte badge d'un membre à partir des données existantes.
 * @returns {BadgeContext}
 */
export function buildBadgeContext({ userId, pseudo, watchlist = [], watched = [], availability = [], chatMessages = [] }) {
  const mine = entry => (userId && entry.user_id === userId) ||
    (pseudo && (entry.pseudo || '').toLowerCase() === pseudo.toLowerCase())
  const myWatched = watched.filter(mine)
  return {
    seen: new Set(myWatched.map(w => w.item_id)).size,
    total: watchlist.length,
    comments: myWatched.filter(w => w.comment).length,
    ratings: myWatched.filter(w => w.rating).length,
    perfectTens: myWatched.filter(w => w.rating === 10).length,
    chatCount: chatMessages.filter(mine).length,
    availabilityCount: availability.filter(mine).length,
  }
}

/** @returns {Array<{id: string, icon: string, name: string, description: string, unlocked: boolean}>} */
export function computeBadges(ctx) {
  return BADGES.map(badge => ({
    id: badge.id,
    icon: badge.icon,
    name: badge.name,
    description: badge.description,
    unlocked: badge.check(ctx),
  }))
}

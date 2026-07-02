/**
 * Constantes partagées de l'application.
 * Centralisées ici pour éviter la duplication entre vues et hooks.
 */

/** Créneaux de séance proposés dans le calendrier. */
export const CINEMA_SLOTS = [
  { key: 'prime', label: '20h30', vibe: 'Séance principale' },
  { key: 'second', label: '21h30', vibe: 'Deuxième séance' },
  { key: 'late', label: '22h30', vibe: 'Late show' },
]

/** Métadonnées par type de contenu (label, icône, durée estimée en minutes si inconnue). */
export const TYPE_META = {
  film: { label: 'Film', icon: '🎬', fallbackRuntime: 130 },
  serie: { label: 'Série', icon: '📺', fallbackRuntime: 450 },
  anime: { label: 'Anime', icon: '🍥', fallbackRuntime: 300 },
}

/** Filtres disponibles sur la liste du marathon. */
export const LIST_FILTERS = [
  ['all', 'Tous'],
  ['film', 'Films'],
  ['serie', 'Séries'],
  ['anime', 'Animes'],
  ['unseen', 'Non vus'],
  ['seen', 'Vus'],
]

/** Préférences d'envie pour le calendrier. */
export const AVAILABILITY_PREFERENCES = [
  ['any', 'Peu importe'],
  ['film', 'Film'],
  ['serie', 'Série'],
  ['short', 'Épisode court'],
]

/** Règles d'XP du marathon (gamification, calculée côté client). */
export const XP_RULES = {
  perWatch: 50,
  perComment: 15,
  perRating: 10,
}

/** Objectif par défaut d'un marathon (modifiable par room, stocké en localStorage). */
export function getDefaultGoal() {
  const now = new Date()
  const christmas = new Date(now.getFullYear(), 11, 25)
  if (christmas < now) christmas.setFullYear(christmas.getFullYear() + 1)
  return { label: 'Terminer avant Noël 🎄', date: christmas.toISOString().slice(0, 10) }
}

/** Identifiants de vues de l'application (navigation sidebar). */
export const VIEWS = {
  OVERVIEW: 'overview',
  LISTE: 'liste',
  REGARDER: 'regarder',
  VU: 'vu',
  CALENDRIER: 'calendrier',
  STATS: 'stats',
  CLASSEMENT: 'classement',
  DISCUSSIONS: 'discussions',
  ADMIN: 'admin',
  PARAMETRES: 'parametres',
}

/** Emojis d'avatar proposés (validés aussi côté serveur). */
export const AVATAR_EMOJIS = ['🎬', '🍿', '📺', '🎭', '🎥', '⭐', '🦸', '🧙', '👽', '🤖', '🐉', '🕷️', '🃏', '🔥', '💀', '👑']

/** Teintes de couleur proposées pour l'avatar. */
export const AVATAR_HUES = [40, 0, 25, 90, 150, 190, 220, 270, 320]

/**
 * Fonctions de formatage pures (dates, durées, identités visuelles).
 */

/** Formate une durée en minutes vers "92h45" ou "45min". */
export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0min'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** "12/05/2026" */
export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR')
}

/** "20:15" */
export function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** "il y a 5 min", "il y a 3 h", "hier", sinon date courte. */
export function formatRelative(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/** Nombre de jours restants (entier, min 0) jusqu'à une date ISO. */
export function daysUntil(isoDate) {
  if (!isoDate) return 0
  const target = new Date(isoDate + 'T23:59:59')
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000))
}

/** Initiale(s) d'un pseudo pour un avatar. */
export function initials(pseudo) {
  return (pseudo || '?').trim().charAt(0).toUpperCase()
}

/**
 * Teinte stable dérivée d'un pseudo (avatar coloré déterministe).
 * @returns {number} hue 0-359
 */
export function pseudoHue(pseudo) {
  let hash = 0
  const str = pseudo || ''
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 360
  return hash
}

/** Tronque proprement un texte. */
export function truncate(text, max = 160) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text
}

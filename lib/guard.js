import { blockUser, getUserById } from './db'
import { checkForbidden } from './moderation'

/**
 * Garde-fous de modération partagés par les endpoints d'écriture.
 */

/** IP réelle du client derrière Vercel. */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  return (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || ''
}

/**
 * Vérifie que le compte n'est ni bloqué ni banni.
 * @returns {Promise<'ok'|'blocked'|'banned'|'gone'>}
 */
export async function accountStatus(userId) {
  const dbUser = await getUserById(userId)
  if (!dbUser) return 'gone'
  if (dbUser.banned) return 'banned'
  if (dbUser.blocked_at) return 'blocked'
  return 'ok'
}

/**
 * Analyse les textes fournis. Si un terme haineux est détecté :
 * bloque le compte, enregistre le contexte pour l'admin, et renvoie
 * la réponse 451 (le message n'est JAMAIS sauvegardé).
 * @returns {Promise<boolean>} true si la requête a été bloquée (réponse envoyée)
 */
export async function moderateOrBlock(res, user, texts, context) {
  const combined = texts.filter(Boolean).join(' \n ')
  const term = checkForbidden(combined)
  if (!term) return false

  // L'admin du site est immunisé contre l'auto-suspension (sinon il ne
  // pourrait plus se débloquer lui-même...) — le message reste refusé.
  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  if (adminPseudo && user.pseudo === adminPseudo) {
    res.status(400).json({ error: `Terme interdit détecté (« ${term} ») — message refusé. Compte admin non suspendu.` })
    return true
  }

  const reason = JSON.stringify({
    term,
    context,
    text: combined.slice(0, 500),
    at: new Date().toISOString(),
  })
  await blockUser(user.id, reason)
  res.status(451).json({
    error: 'Propos interdit détecté. Votre compte est suspendu en attendant l\'examen par l\'administrateur.',
    blocked: true,
  })
  return true
}

/**
 * Refuse la requête si le compte est bloqué/banni (451) ou supprimé (404).
 * @returns {Promise<boolean>} true si la réponse a été envoyée
 */
export async function rejectIfSuspended(res, user) {
  const status = await accountStatus(user.id)
  if (status === 'ok') return false
  if (status === 'gone') {
    res.status(404).json({ error: 'Compte introuvable' })
  } else {
    res.status(451).json({
      error: status === 'banned' ? 'Compte banni.' : 'Compte suspendu — en attente de l\'examen par l\'administrateur.',
      blocked: true,
    })
  }
  return true
}

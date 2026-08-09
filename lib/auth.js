import jwt from 'jsonwebtoken'

// Pas de valeur par défaut : un secret JWT connu dans le code source
// permettrait à quiconque de forger un token valide (y compris pour l'admin).
// Si la variable d'env manque, on préfère planter bruyamment plutôt que de
// signer avec un secret prévisible.
const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  throw new Error('JWT_SECRET manquant — définissez cette variable d\'environnement (jamais de valeur par défaut pour un secret).')
}

export function signToken(user) {
  return jwt.sign({ id: user.id, pseudo: user.pseudo }, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function getTokenFromReq(req) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export function requireAuth(req) {
  const token = getTokenFromReq(req)
  if (!token) return null
  return verifyToken(token)
}

/** Un jour : en deçà, inutile de re-signer (le poll tourne toutes les 45 s). */
const REFRESH_AFTER_SECONDS = 24 * 60 * 60

/**
 * Jeton glissant : prolonge la session de l'utilisateur ACTIF en renvoyant un
 * jeton frais dans l'en-tête `X-Refreshed-Token` (le client le stocke, voir
 * utils/api.js). Sans cela, un jeton signé pour 30 jours déconnectait tout le
 * monde 30 jours après la connexion, sans raison visible — y compris des gens
 * qui utilisaient le site la veille.
 *
 * Seule une vraie inactivité de 30 jours finit désormais par déconnecter.
 * On ne re-signe qu'une fois par jour au maximum, pour ne pas refaire une
 * signature à chaque requête du poll.
 */
export function maybeRefreshToken(req, res) {
  const payload = requireAuth(req)
  if (!payload) return
  const ageSeconds = Math.floor(Date.now() / 1000) - (payload.iat || 0)
  if (ageSeconds < REFRESH_AFTER_SECONDS) return
  res.setHeader('X-Refreshed-Token', signToken({ id: payload.id, pseudo: payload.pseudo }))
}
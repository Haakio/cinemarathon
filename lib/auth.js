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
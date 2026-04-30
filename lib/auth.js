import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'cinemarathon-secret-change-me'

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
import { requireAuth } from '../../../../lib/auth'

const fallbackIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

function parseTurnUrls(value) {
  return (value || '')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean)
    .map(url => url.startsWith('turn:') || url.startsWith('turns:') ? url : `turn:${url}`)
}

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })
  if (req.method !== 'GET') return res.status(405).end()

  const turnUrls = parseTurnUrls(process.env.TURN_URLS)
  const iceServers = [...fallbackIceServers]

  const turnEnabled = turnUrls.length > 0 && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL

  if (turnEnabled) {
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    })
  }

  return res.status(200).json({
    iceServers,
    iceTransportPolicy: turnEnabled ? 'relay' : 'all',
    turnEnabled,
  })
}

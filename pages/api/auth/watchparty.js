import {
  answerWatchPartyPeer,
  createWatchPartyPeer,
  endWatchPartySession,
  getWatchPartyPeer,
  getWatchPartyPeers,
  getWatchPartySession,
  startWatchPartySession,
} from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })

  if (req.method === 'GET') {
    const { roomId = 'marvel', peerId } = req.query
    try {
      if (peerId) {
        const peer = await getWatchPartyPeer(peerId)
        return res.status(200).json({ peer })
      }

      const session = await getWatchPartySession(roomId)
      const peers = session ? await getWatchPartyPeers(session.id) : []
      return res.status(200).json({ session, peers })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  if (req.method === 'POST') {
    const { action, roomId = 'marvel', sessionId, peerId, offer, answer } = req.body

    try {
      if (action === 'start') {
        const session = {
          id: uid(),
          roomId,
          hostUserId: user.id,
          hostPseudo: user.pseudo,
        }
        const saved = await startWatchPartySession(session)
        if (!saved) return res.status(503).json({ error: 'Watch Party pas encore initialisee. Relancez le setup.' })
        return res.status(201).json({ session: { ...session, active: true } })
      }

      if (action === 'end') {
        await endWatchPartySession(roomId, user.id)
        return res.status(200).json({ ok: true })
      }

      if (action === 'join') {
        if (!sessionId || !offer) return res.status(400).json({ error: 'Session et offre requises' })
        const peer = {
          id: uid(),
          roomId,
          sessionId,
          viewerUserId: user.id,
          viewerPseudo: user.pseudo,
          offer,
        }
        const saved = await createWatchPartyPeer(peer)
        if (!saved) return res.status(503).json({ error: 'Watch Party pas encore initialisee. Relancez le setup.' })
        return res.status(201).json({ peer })
      }

      if (action === 'answer') {
        if (!peerId || !answer) return res.status(400).json({ error: 'Peer et reponse requis' })
        await answerWatchPartyPeer(peerId, answer)
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Action inconnue' })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).end()
}

import { requireAuth } from '../../../lib/auth'

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max)
}

export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorise' })
  if (req.method !== 'POST') return res.status(405).end()

  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return res.status(500).json({ error: 'Webhook Discord manquant' })

  const type = clean(req.body.type, 40) || 'Retour'
  const message = clean(req.body.message, 1500)
  const roomName = clean(req.body.roomName, 80) || 'Room inconnue'

  if (!message) return res.status(400).json({ error: 'Message requis' })

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CineMarathon Feedback',
        embeds: [{
          title: `${type} - ${roomName}`,
          color: 13215820,
          fields: [
            { name: 'Par', value: user.pseudo || user.id || 'Membre', inline: true },
            { name: 'Room', value: roomName, inline: true },
            { name: 'Message', value: message },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'Discord a refuse le message' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

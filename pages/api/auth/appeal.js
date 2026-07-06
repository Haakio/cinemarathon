import { createAppealMessage, getAppealMessages, getUserById } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

/**
 * Canal d'appel : la SEULE zone où un compte bloqué/banni peut écrire,
 * pour s'expliquer avec la modération.
 * GET               → ma conversation (compte bloqué) ou ?userId= (admin)
 * POST { message }  → côté bloqué ; { message, userId } → côté admin
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  const isAdmin = Boolean(adminPseudo) && user.pseudo === adminPseudo

  try {
    if (req.method === 'GET') {
      if (isAdmin && req.query.userId) {
        const messages = await getAppealMessages(String(req.query.userId))
        return res.status(200).json({ messages })
      }
      // Côté membre : uniquement s'il est réellement bloqué/banni
      const me = await getUserById(user.id)
      if (!me) return res.status(404).json({ error: 'Compte introuvable' })
      if (!me.blocked_at && !me.banned) return res.status(403).json({ error: 'Canal réservé aux comptes suspendus' })
      const messages = await getAppealMessages(user.id)
      return res.status(200).json({ messages })
    }

    if (req.method === 'POST') {
      const { message, userId } = req.body
      const text = (message || '').trim()
      if (!text) return res.status(400).json({ error: 'Message vide' })
      if (text.length > 1000) return res.status(400).json({ error: 'Message trop long (max 1000)' })

      if (isAdmin && userId) {
        // Réponse de la modération
        await createAppealMessage({ id: uid(), userId: String(userId), fromAdmin: true, pseudo: user.pseudo, message: text })
        return res.status(201).json({ ok: true })
      }

      // Message du compte suspendu (pas de re-modération ici : le canal est
      // privé entre lui et vous — vous jugez sur pièce)
      const me = await getUserById(user.id)
      if (!me) return res.status(404).json({ error: 'Compte introuvable' })
      if (!me.blocked_at && !me.banned) return res.status(403).json({ error: 'Canal réservé aux comptes suspendus' })
      await createAppealMessage({ id: uid(), userId: user.id, fromAdmin: false, pseudo: user.pseudo, message: text })
      return res.status(201).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

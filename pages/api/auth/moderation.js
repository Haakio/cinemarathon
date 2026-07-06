import { addBannedIp, banUser, getModerationList, getUser, getUserById, removeBannedIpsFor, setUserModerator, unblockUser } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * Pupitre de modération.
 * ADMIN DU SITE : tout. MODÉRATEURS (épée verte) : consultation + déblocage.
 * GET  → comptes bloqués (en attente de verdict) et bannis
 * POST { action: 'unblock', userId }            → débloquer (admin + modos)
 * POST { action: 'ban', userId, banIp: bool }   → bannir (ADMIN uniquement)
 * POST { action: 'unban', userId }              → débannir (ADMIN uniquement)
 * POST { action: 'mod'|'unmod', pseudo }        → nommer/révoquer (ADMIN uniquement)
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  const adminPseudo = process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  const isAdmin = Boolean(adminPseudo) && user.pseudo === adminPseudo
  let isModerator = false
  if (!isAdmin) {
    const me = await getUserById(user.id)
    isModerator = Boolean(me?.moderator)
  }
  if (!isAdmin && !isModerator) {
    return res.status(403).json({ error: 'Réservé à la modération du site' })
  }

  try {
    if (req.method === 'GET') {
      const rows = await getModerationList()
      return res.status(200).json({
        cases: rows.map(row => {
          let reason = null
          try { reason = row.blocked_reason ? JSON.parse(row.blocked_reason) : null } catch { }
          return {
            userId: row.id,
            pseudo: row.pseudo,
            blockedAt: row.blocked_at,
            banned: Boolean(row.banned),
            lastIp: row.last_ip || '',
            term: reason?.term || '',
            context: reason?.context || '',
            text: reason?.text || '',
          }
        }),
      })
    }

    if (req.method === 'POST') {
      const { action, userId, banIp, pseudo } = req.body

      // Nomination / révocation d'un modérateur du site (épée verte)
      if (action === 'mod' || action === 'unmod') {
        if (!isAdmin) return res.status(403).json({ error: 'Réservé à l\'administrateur du site' })
        if (!pseudo?.trim()) return res.status(400).json({ error: 'Pseudo requis' })
        const target = await getUser(pseudo.trim())
        if (!target) return res.status(404).json({ error: 'Aucun compte avec ce pseudo' })
        await setUserModerator(target.id, action === 'mod')
        return res.status(200).json({ ok: true, pseudo: target.pseudo, moderator: action === 'mod' })
      }

      if (!userId) return res.status(400).json({ error: 'Utilisateur requis' })
      const target = await getUserById(userId)
      if (!target) return res.status(404).json({ error: 'Compte introuvable' })
      if (target.id === user.id) return res.status(400).json({ error: 'Impossible sur votre propre compte' })

      if (action === 'unblock') {
        // Admin + modos : rendre l'accès après examen du contexte
        await unblockUser(userId)
        await removeBannedIpsFor(target.pseudo)
        return res.status(200).json({ ok: true })
      }

      if (action === 'unban') {
        if (!isAdmin) return res.status(403).json({ error: 'Réservé à l\'administrateur du site' })
        await unblockUser(userId)
        await removeBannedIpsFor(target.pseudo)
        return res.status(200).json({ ok: true })
      }

      if (action === 'ban') {
        if (!isAdmin) return res.status(403).json({ error: 'Réservé à l\'administrateur du site' })
        await banUser(userId)
        if (banIp && target.last_ip) {
          await addBannedIp(target.last_ip, target.pseudo)
        }
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Action inconnue' })
    }

    return res.status(405).end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

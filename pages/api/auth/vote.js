import {
  cancelVote, closeVote, createVote, getLatestVote, getVoteBallots,
  hasRoomAccess, hasRoomManageAccess, upsertVoteBallot,
} from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

function uid() { return Math.random().toString(36).substr(2, 12) }

async function canManage(roomId, user) {
  const isGlobalAdmin = user.pseudo === (process.env.ADMIN_PSEUDO || process.env.NEXT_PUBLIC_ADMIN_PSEUDO)
  return isGlobalAdmin || await hasRoomManageAccess(roomId, user.id)
}

/**
 * Clôture d'un vote : calcule le gagnant à partir des bulletins.
 * En cas d'égalité, tirage au sort SERVEUR entre les ex æquo, et le
 * détail est stocké (tie_break) pour que le lecteur "Jimmy" rejoue
 * le même résultat chez tout le monde.
 */
async function resolveVote(vote) {
  const ballots = await getVoteBallots(vote.id)
  const itemIds = JSON.parse(vote.item_ids || '[]')
  const counts = new Map(itemIds.map(id => [id, 0]))
  ballots.forEach(b => {
    if (counts.has(b.item_id)) counts.set(b.item_id, counts.get(b.item_id) + 1)
  })

  const max = Math.max(0, ...counts.values())
  const leaders = itemIds.filter(id => counts.get(id) === max)

  let winnerItemId
  let tieBreak = ''
  if (leaders.length <= 1) {
    winnerItemId = leaders[0] || itemIds[0]
  } else {
    // Égalité : tirage serveur entre les 2 premiers ex æquo (ordre du vote)
    const [left, right] = leaders.slice(0, 2)
    const winnerSide = Math.random() < 0.5 ? 'left' : 'right'
    winnerItemId = winnerSide === 'left' ? left : right
    tieBreak = JSON.stringify({ left, right, winnerSide })
  }

  await closeVote(vote.id, winnerItemId, tieBreak)
  return { ...vote, status: 'closed', winner_item_id: winnerItemId, tie_break: tieBreak }
}

/**
 * Votes de séance.
 * GET  ?roomId=  → dernier vote + bulletins (clôture automatique "lazy" si
 *                  l'échéance est passée — aucun cron nécessaire)
 * POST {action:'create', roomId, itemIds, endsAt}  → lancer un vote (admin)
 * POST {action:'ballot', roomId, voteId, itemId}   → voter / changer son vote
 * POST {action:'cancel', roomId, voteId}           → annuler (admin)
 */
export default async function handler(req, res) {
  const user = requireAuth(req)
  if (!user) return res.status(401).json({ error: 'Non autorisé' })

  try {
    if (req.method === 'GET') {
      const { roomId = 'marvel' } = req.query
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })

      let vote = await getLatestVote(roomId)
      if (vote && vote.status === 'open' && new Date(vote.ends_at) <= new Date()) {
        vote = await resolveVote(vote)
      }
      if (!vote || vote.status === 'cancelled') return res.status(200).json({ vote: null, ballots: [] })

      const ballots = await getVoteBallots(vote.id)
      return res.status(200).json({ vote, ballots })
    }

    if (req.method === 'POST') {
      const { action, roomId = 'marvel' } = req.body
      if (!await hasRoomAccess(roomId, user.id)) return res.status(403).json({ error: 'Room privee' })

      if (action === 'create') {
        if (!await canManage(roomId, user)) return res.status(403).json({ error: 'Interdit' })
        const { itemIds, endsAt } = req.body
        if (!Array.isArray(itemIds) || itemIds.length < 2 || itemIds.length > 5) {
          return res.status(400).json({ error: 'Choisissez entre 2 et 5 films' })
        }
        const ends = new Date(endsAt)
        if (Number.isNaN(ends.getTime()) || ends <= new Date()) {
          return res.status(400).json({ error: "L'échéance doit être dans le futur" })
        }
        const vote = {
          id: uid(),
          roomId,
          itemIds: JSON.stringify(itemIds),
          endsAt: ends.toISOString(),
          createdBy: user.id,
          createdPseudo: user.pseudo,
        }
        await createVote(vote)
        return res.status(201).json({ ok: true })
      }

      if (action === 'ballot') {
        const { voteId, itemId } = req.body
        if (!voteId || !itemId) return res.status(400).json({ error: 'Vote et film requis' })
        const vote = await getLatestVote(roomId)
        if (!vote || vote.id !== voteId || vote.status !== 'open') {
          return res.status(409).json({ error: "Ce vote n'est plus ouvert" })
        }
        if (new Date(vote.ends_at) <= new Date()) {
          await resolveVote(vote)
          return res.status(409).json({ error: 'Le vote vient de se terminer' })
        }
        const itemIds = JSON.parse(vote.item_ids || '[]')
        if (!itemIds.includes(itemId)) return res.status(400).json({ error: 'Film hors du vote' })
        await upsertVoteBallot({ voteId, userId: user.id, pseudo: user.pseudo, itemId })
        return res.status(200).json({ ok: true })
      }

      if (action === 'cancel') {
        if (!await canManage(roomId, user)) return res.status(403).json({ error: 'Interdit' })
        const { voteId } = req.body
        if (!voteId) return res.status(400).json({ error: 'Vote requis' })
        await cancelVote(voteId)
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

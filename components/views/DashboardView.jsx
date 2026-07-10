import { useMemo } from 'react'
import HeroCard from '../cards/HeroCard'
import ProgressCard from '../cards/ProgressCard'
import GoalCard from '../cards/GoalCard'
import NextUpCard from '../cards/NextUpCard'
import MembersCard from '../cards/MembersCard'
import ActivityFeed from '../widgets/ActivityFeed'
import { buildActivity, buildMembers, getNextItem, getProgress } from '../../utils/stats'

/**
 * Vue d'ensemble : le cœur vivant du site.
 * Hero, progression animée, objectif, prochain film, activité et membres.
 * Tout est dérivé des données déjà chargées — zéro requête supplémentaire.
 */
export default function DashboardView({
  currentRoom, currentUser, watchlist, watchOrder, watched, seenSource, availability, chatMessages, roomMembers,
  goal, onSaveGoal, onDeleteGoal, canManageGoal, onWatch, onOpenDetails, avatarMap, friends, voteApi, onInvite,
}) {
  // seenSource = watched complet en room privée, ou seulement MES visionnages
  // en room publique (progression personnelle). Les membres/activité gardent
  // les données complètes.
  const seen = seenSource || watched
  const progress = useMemo(() => getProgress(watchlist, seen), [watchlist, seen])
  const seenSetForVote = useMemo(() => new Set(seen.map(w => w.item_id)), [seen])

  // Prochain film : suit l'ordre/filtre actuellement choisi dans "Liste"
  // (chronologique ou MCU) — garantit aussi que "Démarrer la séance" trouve
  // toujours le titre dans "Regarder" (même liste que goWatch utilise).
  // Le gagnant d'un vote clos (tant qu'il n'est pas vu) est prioritaire,
  // MAIS seulement s'il fait partie de cet ordre courant. En cas d'égalité,
  // on attend que l'admin ait laissé Jimmy trancher (flag serveur — pas de spoiler).
  const order = watchOrder || watchlist
  const nextItem = useMemo(() => {
    const vote = voteApi?.vote
    const winnerId = vote?.status === 'closed' ? vote.winner_item_id : null
    const jimmyPending = (() => {
      if (!vote?.tie_break) return false
      try { return !JSON.parse(vote.tie_break).revealed } catch { return false }
    })()
    if (winnerId && !jimmyPending && !seenSetForVote.has(winnerId)) {
      const winner = order.find(i => i.id === winnerId)
      if (winner) return winner
    }
    return getNextItem(order, seen)
  }, [order, seen, voteApi, seenSetForVote])
  const members = useMemo(
    () => buildMembers({ watchlist, watched, availability, chatMessages, roomMembers, currentUser }),
    [watchlist, watched, availability, chatMessages, roomMembers, currentUser]
  )
  // 30 entrées gardées : ~6 visibles, le reste accessible au scroll
  const activity = useMemo(
    () => buildActivity({ watchlist, watched, availability }, 30),
    [watchlist, watched, availability]
  )

  return (
    <>
      <div className="dash-grid">
        <div className="dash-main">
          <HeroCard room={currentRoom} progress={progress} memberCount={members.length} watchlist={watchlist} onInvite={onInvite} />
          <ProgressCard progress={progress} />
          <NextUpCard item={nextItem} onStart={onWatch} onOpenDetails={onOpenDetails} />
          {/* Objectif : visible par tous s'il existe ; sinon seuls les admins
              voient la carte de création */}
          {(goal || canManageGoal) && (
            <GoalCard
              goal={goal}
              progress={progress}
              canManage={canManageGoal}
              onSaveGoal={onSaveGoal}
              onDeleteGoal={onDeleteGoal}
            />
          )}
        </div>
        <div className="dash-side">
          <ActivityFeed activity={activity} />
          <MembersCard members={members} avatarMap={avatarMap} friends={friends} />
        </div>
      </div>
    </>
  )
}

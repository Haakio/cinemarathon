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
  currentRoom, currentUser, watchlist, watched, availability, chatMessages, roomMembers,
  goal, onSaveGoal, onWatch, onOpenDetails,
}) {
  const progress = useMemo(() => getProgress(watchlist, watched), [watchlist, watched])
  const nextItem = useMemo(() => getNextItem(watchlist, watched), [watchlist, watched])
  const members = useMemo(
    () => buildMembers({ watchlist, watched, availability, chatMessages, roomMembers, currentUser }),
    [watchlist, watched, availability, chatMessages, roomMembers, currentUser]
  )
  const activity = useMemo(
    () => buildActivity({ watchlist, watched, availability }),
    [watchlist, watched, availability]
  )

  return (
    <>
      <div className="dash-grid">
        <div className="dash-main">
          <HeroCard room={currentRoom} progress={progress} memberCount={members.length} watchlist={watchlist} />
          <ProgressCard progress={progress} />
          <NextUpCard item={nextItem} onStart={onWatch} onOpenDetails={onOpenDetails} />
          <GoalCard goal={goal} progress={progress} onSaveGoal={onSaveGoal} />
        </div>
        <div className="dash-side">
          <ActivityFeed activity={activity} />
          <MembersCard members={members} />
        </div>
      </div>
    </>
  )
}

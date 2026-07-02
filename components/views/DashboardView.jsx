import { useMemo } from 'react'
import VoteCard from '../cards/VoteCard'
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
  goal, onSaveGoal, onWatch, onOpenDetails, avatarMap, voteApi,
}) {
  const progress = useMemo(() => getProgress(watchlist, watched), [watchlist, watched])
  const seenSetForVote = useMemo(() => new Set(watched.map(w => w.item_id)), [watched])

  // Prochain film : le gagnant d'un vote clos (tant qu'il n'est pas vu)
  // est prioritaire sur l'ordre du marathon.
  const nextItem = useMemo(() => {
    const winnerId = voteApi?.vote?.status === 'closed' ? voteApi.vote.winner_item_id : null
    if (winnerId && !seenSetForVote.has(winnerId)) {
      const winner = watchlist.find(i => i.id === winnerId)
      if (winner) return winner
    }
    return getNextItem(watchlist, watched)
  }, [watchlist, watched, voteApi, seenSetForVote])
  const members = useMemo(
    () => buildMembers({ watchlist, watched, availability, chatMessages, roomMembers, currentUser }),
    [watchlist, watched, availability, chatMessages, roomMembers, currentUser]
  )
  const activity = useMemo(
    () => buildActivity({ watchlist, watched, availability }),
    [watchlist, watched, availability]
  )

  // Le vote s'affiche s'il est ouvert, ou clos tant que le film gagnant
  // n'a pas encore été vu (ensuite la carte disparaît d'elle-même).
  const showVote = voteApi?.vote && (
    voteApi.vote.status === 'open' ||
    (voteApi.vote.status === 'closed' && voteApi.vote.winner_item_id && !seenSetForVote.has(voteApi.vote.winner_item_id))
  )

  return (
    <>
      <div className="dash-grid">
        <div className="dash-main">
          {showVote && (
            <VoteCard
              vote={voteApi.vote}
              ballots={voteApi.ballots}
              myBallot={voteApi.myBallot}
              watchlist={watchlist}
              currentUser={currentUser}
              avatarMap={avatarMap}
              onBallot={voteApi.castBallot}
            />
          )}
          <HeroCard room={currentRoom} progress={progress} memberCount={members.length} watchlist={watchlist} />
          <ProgressCard progress={progress} />
          <NextUpCard item={nextItem} onStart={onWatch} onOpenDetails={onOpenDetails} />
          <GoalCard goal={goal} progress={progress} onSaveGoal={onSaveGoal} />
        </div>
        <div className="dash-side">
          <ActivityFeed activity={activity} />
          <MembersCard members={members} avatarMap={avatarMap} />
        </div>
      </div>
    </>
  )
}

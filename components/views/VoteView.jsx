import VoteCard from '../cards/VoteCard'
import VoteComposer from '../cards/VoteComposer'

/**
 * Page Vote film : le vote en cours (ou son résultat), et le composeur
 * pour l'admin. Les données viennent de useVote (chargé au niveau app,
 * même source que la cloche de la sidebar).
 */
export default function VoteView({ currentRoom, currentUser, watchlist, watched, avatarMap, voteApi, canManage }) {
  const { vote, ballots, myBallot, castBallot, createVote, cancelActiveVote, revealJimmy } = voteApi
  const isOpen = vote?.status === 'open'
  const hasResult = vote?.status === 'closed' && vote.winner_item_id

  return (
    <>
      <div className="view-head anim-up">
        <h1>Vote film</h1>
        <p>Choisissez ensemble le prochain film de la room {currentRoom.name}</p>
      </div>

      {(isOpen || hasResult) && (
        <VoteCard
          vote={vote}
          ballots={ballots}
          myBallot={myBallot}
          watchlist={watchlist}
          currentUser={currentUser}
          avatarMap={avatarMap}
          onBallot={castBallot}
          canManage={canManage}
          onReveal={revealJimmy}
        />
      )}

      {isOpen && canManage && (
        <button className="btn-ghost" style={{ width: 'auto', marginTop: '16px' }} onClick={cancelActiveVote}>
          Annuler le vote en cours
        </button>
      )}

      {!isOpen && canManage && (
        <div style={{ marginTop: (isOpen || hasResult) ? '22px' : 0 }}>
          <VoteComposer watchlist={watchlist} watched={watched} onCreate={createVote} />
        </div>
      )}

      {!isOpen && !hasResult && !canManage && (
        <div className="empty-state">
          <div className="icon">🗳️</div>
          <p>Aucun vote en cours.<br />L'admin de la room peut en lancer un — vous serez prévenu par la cloche dans le menu.</p>
        </div>
      )}
    </>
  )
}

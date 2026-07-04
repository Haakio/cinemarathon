import Head from 'next/head'
import { useCallback, useEffect, useMemo, useState } from 'react'

// Hooks (logique data, comportement identique à l'ancienne version)
import { usePageVisible } from '../hooks/usePageVisible'
import { useMarathon } from '../hooks/useMarathon'
import { useChat } from '../hooks/useChat'
import { useSocial } from '../hooks/useSocial'
import { useVote } from '../hooks/useVote'

// Layout
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'
import RoomBar from '../components/layout/RoomBar'

// Vues
import AuthScreen from '../components/views/AuthScreen'
import DashboardView from '../components/views/DashboardView'
import ListView from '../components/views/ListView'
import WatchView from '../components/views/WatchView'
import SeenView from '../components/views/SeenView'
import CalendarView from '../components/views/CalendarView'
import StatsView from '../components/views/StatsView'
import LeaderboardView from '../components/views/LeaderboardView'
import AdminView from '../components/views/AdminView'
import DiscussionsView from '../components/views/DiscussionsView'
import VoteView from '../components/views/VoteView'

// Modals & widgets
import MovieModal from '../components/modals/MovieModal'
import RoomModal from '../components/modals/RoomModal'
import RoomsHubModal from '../components/modals/RoomsHubModal'
import InviteModal from '../components/modals/InviteModal'
import ProfileModal from '../components/modals/ProfileModal'
import ChatConsentModal from '../components/modals/ChatConsentModal'
import ChatWidget from '../components/widgets/ChatWidget'
import FeedbackWidget from '../components/widgets/FeedbackWidget'
import Toast from '../components/widgets/Toast'

// Utils
import { api, clearSession, getStoredGoal, getStoredUser, getToken, saveSession, saveStoredGoal } from '../utils/api'
import { getDefaultGoal, VIEWS } from '../utils/constants'

/**
 * Orchestrateur de l'application.
 * Chaque responsabilité vit dans son hook / composant : ce fichier ne fait
 * que composer. Les données sont chargées une fois (useMarathon) puis
 * partagées entre toutes les vues — zéro requête dupliquée.
 */
export default function App() {
  // ── Session ─────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  // ── Navigation & UI ─────────────────────────────────────
  const [view, setView] = useState(VIEWS.OVERVIEW)
  const [watchIdx, setWatchIdx] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  // ── Room panel (modal) ──────────────────────────────────
  const [roomsHubOpen, setRoomsHubOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roomPanelOpen, setRoomPanelOpen] = useState(false)
  const [roomPanelMode, setRoomPanelMode] = useState('join')
  const [roomMsg, setRoomMsg] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomPublic, setNewRoomPublic] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [roomJoinName, setRoomJoinName] = useState('')
  const [roomJoinCode, setRoomJoinCode] = useState('')
  const [roomManageCode, setRoomManageCode] = useState('')
  const [roomManageImage, setRoomManageImage] = useState('')

  const pageVisible = usePageVisible()

  const showToast = useCallback(msg => {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2200)
  }, [])

  // ── Données marathon (source de vérité unique) ──────────
  const marathon = useMarathon({
    authed, currentUser, view, pageVisible,
    membersWanted: roomPanelOpen || view === VIEWS.ADMIN,
  })
  const {
    rooms, setRooms, currentRoomId, selectRoom, currentRoom,
    canDeleteCurrentRoom, canManageCurrentRoom, isAdmin,
    watchlist, watched, availability, roomMembers, setRoomMembers,
    loadData, loadAvailability, reset,
  } = marathon

  const chat = useChat({ authed, currentUser, currentRoomId, pageVisible, onError: showToast })
  const social = useSocial({ authed, currentUser, onError: showToast })
  const voteApi = useVote({ authed, currentRoomId, currentUser, view, pageVisible, onError: showToast })

  // Cloche sur l'entrée "Vote film" de la sidebar : vote ouvert pas encore voté
  const voteBadge = voteApi.voteOpen && !voteApi.myBallot

  // Dans une room PUBLIQUE, la progression et les coches "Vu" sont
  // personnelles (sinon les inconnus se spoilent la progression entre eux).
  // Les avis restent visibles par tous dans les fiches et "Déjà vu".
  const isPublicRoom = currentRoom.id === 'marvel' || currentRoom.is_private === false
  const seenSource = useMemo(
    () => (isPublicRoom ? watched.filter(w => w.user_id === currentUser?.id) : watched),
    [isPublicRoom, watched, currentUser]
  )

  // ── Cycle de vie ────────────────────────────────────────
  useEffect(() => { setMounted(true) }, [])

  // Restauration de session
  useEffect(() => {
    const user = getStoredUser()
    const token = getToken()
    if (user && token) { setCurrentUser(user); setAuthed(true) }
  }, [])

  // Garde d'accès admin (comportement conservé)
  useEffect(() => {
    if (view === VIEWS.ADMIN && !canManageCurrentRoom) setView(VIEWS.LISTE)
  }, [view, canManageCurrentRoom])

  // ── Objectif du marathon (localStorage par room) ────────
  const [goal, setGoal] = useState(getDefaultGoal())
  useEffect(() => {
    if (!mounted) return
    setGoal(getStoredGoal(currentRoomId) || getDefaultGoal())
  }, [mounted, currentRoomId])

  const saveGoal = useCallback(next => {
    setGoal(next)
    saveStoredGoal(currentRoomId, next)
    showToast('Objectif mis à jour 🎯')
  }, [currentRoomId, showToast])

  // ── Actions ─────────────────────────────────────────────
  function onAuthed(token, user) {
    saveSession(token, user)
    setCurrentUser(user)
    setAuthed(true)
  }

  function logout() {
    clearSession()
    setAuthed(false)
    setCurrentUser(null)
    setProfileOpen(false)
    setView(VIEWS.OVERVIEW)
    chat.resetChat()
    reset()
  }

  const goWatch = useCallback(id => {
    const idx = watchlist.findIndex(w => w.id === id)
    if (idx >= 0) {
      setWatchIdx(idx)
      setView(VIEWS.REGARDER)
      setSelectedItem(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [watchlist])

  const openDetails = useCallback(item => setSelectedItem(item), [])

  function onSelectRoom(roomId) {
    selectRoom(roomId)
    setWatchIdx(0)
  }

  async function deleteReview(id) {
    if (!confirm('Supprimer cet avis ?')) return
    try {
      await api('DELETE', '/auth/watchlist/watched', { id, roomId: currentRoomId })
      showToast('Avis supprimé.')
      loadData()
    } catch (e) {
      showToast('Erreur: ' + e.message)
    }
  }

  // ── Actions rooms (mêmes endpoints qu'avant) ────────────
  async function createNewRoom() {
    if (!newRoomName.trim()) { setRoomMsg('Entrez un nom de room.'); return }
    if (!newRoomPublic && !roomCode.trim()) { setRoomMsg('Entrez un code de room.'); return }
    try {
      const room = await api('POST', '/auth/rooms', { name: newRoomName, code: roomCode, isPublic: newRoomPublic })
      setRooms(prev => [...prev, room])
      setNewRoomName(''); setRoomCode(''); setNewRoomPublic(false); setRoomMsg('')
      setRoomPanelOpen(false)
      onSelectRoom(room.id)
      showToast(newRoomPublic ? 'Room publique créée.' : 'Room privée créée.')
    } catch (e) { setRoomMsg(e.message) }
  }

  // Lien d'invitation ?invite=TOKEN : rejoint la room après connexion,
  // puis nettoie l'URL (le paramètre survit à l'écran de login).
  useEffect(() => {
    if (!authed) return
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (!token) return
    window.history.replaceState({}, '', window.location.pathname)
    api('POST', '/auth/rooms', { action: 'joinInvite', token })
      .then(room => {
        setRooms(prev => prev.some(existing => existing.id === room.id) ? prev : [...prev, room])
        onSelectRoom(room.id)
        showToast(`Bienvenue dans ${room.name} ! 🎬`)
      })
      .catch(e => showToast(e.message))
  }, [authed]) // eslint-disable-line react-hooks/exhaustive-deps

  async function acceptRoomInvite(invite) {
    try {
      const room = await api('POST', '/auth/rooms', { action: 'acceptInvite', roomId: invite.roomId })
      setRooms(prev => prev.some(existing => existing.id === room.id) ? prev : [...prev, room])
      social.removeRoomInvite(invite.roomId)
      setProfileOpen(false)
      onSelectRoom(room.id)
      showToast(`Bienvenue dans ${room.name} ! 🎬`)
    } catch (e) { showToast(e.message) }
  }

  async function declineRoomInvite(invite) {
    try {
      await api('POST', '/auth/rooms', { action: 'declineInvite', roomId: invite.roomId })
      social.removeRoomInvite(invite.roomId)
    } catch (e) { showToast(e.message) }
  }

  async function joinPublicRoom(roomId) {
    try {
      const room = await api('POST', '/auth/rooms', { action: 'joinPublic', roomId })
      setRooms(prev => prev.some(existing => existing.id === room.id) ? prev : [...prev, room])
      setRoomsHubOpen(false)
      onSelectRoom(room.id)
      showToast(`Bienvenue dans ${room.name} !`)
    } catch (e) { showToast(e.message) }
  }

  async function joinPrivateRoom() {
    if (!roomJoinName.trim() || !roomJoinCode.trim()) { setRoomMsg('Entrez le nom et le code de la room.'); return }
    try {
      const room = await api('POST', '/auth/rooms', { action: 'join', name: roomJoinName, code: roomJoinCode })
      setRooms(prev => prev.some(existing => existing.id === room.id) ? prev : [...prev, room])
      setRoomJoinName(''); setRoomJoinCode(''); setRoomMsg('')
      setRoomPanelOpen(false)
      onSelectRoom(room.id)
      showToast('Room rejointe.')
    } catch (e) { setRoomMsg(e.message) }
  }

  async function deleteCurrentRoom() {
    const room = rooms.find(entry => entry.id === currentRoomId)
    if (!room || room.id === 'marvel') return
    if (!window.confirm(`Supprimer la room "${room.name}" et toutes ses données ?`)) return
    try {
      await api('DELETE', '/auth/rooms', { roomId: room.id })
      const nextRooms = rooms.filter(entry => entry.id !== room.id)
      setRooms(nextRooms)
      setRoomPanelOpen(false)
      onSelectRoom(nextRooms[0]?.id || 'marvel')
      showToast('Room supprimée.')
    } catch (e) { showToast(e.message || 'Impossible de supprimer la room.') }
  }

  async function leaveCurrentRoom() {
    const room = rooms.find(entry => entry.id === currentRoomId)
    if (!room || room.id === 'marvel' || canDeleteCurrentRoom) return
    if (!window.confirm(`Quitter la room "${room.name}" ?`)) return
    try {
      await api('POST', '/auth/rooms', { action: 'leave', roomId: room.id })
      const nextRooms = rooms.filter(entry => entry.id !== room.id)
      setRooms(nextRooms)
      setRoomPanelOpen(false)
      onSelectRoom(nextRooms[0]?.id || 'marvel')
      showToast('Room quittée.')
    } catch (e) { showToast(e.message || 'Impossible de quitter la room.') }
  }

  // Pré-remplit le champ image avec celle de la room courante
  useEffect(() => {
    if (roomPanelOpen) setRoomManageImage(currentRoom.image || '')
  }, [roomPanelOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCurrentRoomImage() {
    try {
      await api('PATCH', '/auth/rooms', { roomId: currentRoomId, image: roomManageImage })
      setRooms(prev => prev.map(room => room.id === currentRoomId ? { ...room, image: roomManageImage.trim() } : room))
      showToast('Photo de room enregistrée.')
    } catch (e) { setRoomMsg(e.message) }
  }

  async function saveCurrentRoomCode() {
    if (!canDeleteCurrentRoom) return
    if (!roomManageCode.trim()) { setRoomMsg('Entrez un code pour cette room.'); return }
    try {
      await api('PATCH', '/auth/rooms', { roomId: currentRoomId, code: roomManageCode })
      setRoomManageCode(''); setRoomMsg('')
      showToast('Code de room mis à jour.')
    } catch (e) { setRoomMsg(e.message) }
  }

  async function kickRoomMember(member) {
    if (!canDeleteCurrentRoom || member.user_id === currentRoom.created_by) return
    if (!window.confirm(`Retirer ${member.pseudo || 'ce membre'} de ${currentRoom.name} ?`)) return
    try {
      await api('POST', '/auth/rooms', { action: 'kick', roomId: currentRoomId, targetUserId: member.user_id })
      setRoomMembers(prev => prev.filter(entry => entry.user_id !== member.user_id))
      showToast('Membre retiré.')
    } catch (e) { setRoomMsg(e.message) }
  }

  // ── Rendu ───────────────────────────────────────────────
  const head = (
    <Head>
      <title>CinéMarathon</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
  )

  if (!mounted) return (
    <>
      {head}
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
    </>
  )

  if (!authed) return (
    <>
      {head}
      <AuthScreen onAuthed={onAuthed} />
    </>
  )

  return (
    <>
      {head}
      <div className="shell">
        <Header
          currentUser={currentUser}
          watchlist={watchlist}
          watched={seenSource}
          onOpenItem={openDetails}
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          onLogout={logout}
          profile={social.profile}
          unreadCount={social.unreadCount}
          voteBadge={voteBadge}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <RoomBar
          currentRoom={currentRoom}
          onOpenHub={() => setRoomsHubOpen(true)}
          canDeleteCurrentRoom={canDeleteCurrentRoom}
          onDeleteRoom={deleteCurrentRoom}
          onLeaveRoom={leaveCurrentRoom}
          roomMsg={!roomPanelOpen ? roomMsg : ''}
        />

        <div className="shell-body">
          <Sidebar
            view={view}
            onNavigate={setView}
            currentRoom={currentRoom}
            memberCount={roomMembers.length}
            canManage={canManageCurrentRoom}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            voteBadge={voteBadge}
          />

          <main className="content">
            {view === VIEWS.OVERVIEW && (
              <DashboardView
                currentRoom={currentRoom}
                currentUser={currentUser}
                watchlist={watchlist}
                watched={watched}
                seenSource={seenSource}
                availability={availability}
                chatMessages={chat.chatMessages}
                roomMembers={roomMembers}
                goal={goal}
                onSaveGoal={saveGoal}
                onWatch={goWatch}
                onOpenDetails={openDetails}
                avatarMap={social.avatarMap}
                voteApi={voteApi}
                onInvite={() => setInviteOpen(true)}
              />
            )}
            {view === VIEWS.VOTE && (
              <VoteView
                currentRoom={currentRoom}
                currentUser={currentUser}
                watchlist={watchlist}
                watched={seenSource}
                avatarMap={social.avatarMap}
                voteApi={voteApi}
                canManage={canManageCurrentRoom}
              />
            )}
            {view === VIEWS.LISTE && (
              <ListView
                currentRoom={currentRoom}
                watchlist={watchlist}
                watched={watched}
                seenSource={seenSource}
                currentUser={currentUser}
                onWatch={goWatch}
                onOpenDetails={openDetails}
              />
            )}
            {view === VIEWS.REGARDER && (
              <WatchView
                watchlist={watchlist}
                watched={watched}
                seenSource={seenSource}
                currentUser={currentUser}
                watchIdx={watchIdx}
                setWatchIdx={setWatchIdx}
                currentRoomId={currentRoomId}
                loadData={loadData}
                showToast={showToast}
              />
            )}
            {view === VIEWS.VU && (
              <SeenView
                watchlist={watchlist}
                watched={watched}
                defaultFilter={isPublicRoom ? 'me' : 'all'}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onDeleteReview={deleteReview}
                onOpenDetails={openDetails}
              />
            )}
            {view === VIEWS.CALENDRIER && (
              <CalendarView
                currentRoom={currentRoom}
                currentRoomId={currentRoomId}
                currentUser={currentUser}
                watchlist={watchlist}
                watched={seenSource}
                availability={availability}
                loadAvailability={loadAvailability}
                showToast={showToast}
              />
            )}
            {view === VIEWS.STATS && (
              <StatsView currentRoom={currentRoom} watchlist={watchlist} watched={watched} seenSource={seenSource} />
            )}
            {view === VIEWS.CLASSEMENT && (
              <LeaderboardView
                currentRoom={currentRoom}
                currentUser={currentUser}
                watchlist={watchlist}
                watched={watched}
                availability={availability}
                chatMessages={chat.chatMessages}
                avatarMap={social.avatarMap}
              />
            )}
            {view === VIEWS.DISCUSSIONS && (
              <DiscussionsView
                currentRoom={currentRoom}
                currentRoomId={currentRoomId}
                currentUser={currentUser}
                isAdmin={isAdmin}
                watchlist={watchlist}
                showToast={showToast}
              />
            )}
            {view === VIEWS.ADMIN && canManageCurrentRoom && (
              <AdminView
                currentRoom={currentRoom}
                currentRoomId={currentRoomId}
                watchlist={watchlist}
                watched={seenSource}
                voteApi={voteApi}
                roomMembers={roomMembers}
                setRoomMembers={setRoomMembers}
                canDeleteCurrentRoom={canDeleteCurrentRoom}
                isGlobalAdmin={isAdmin}
                loadData={loadData}
                showToast={showToast}
              />
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      {selectedItem && (
        <MovieModal
          item={watchlist.find(w => w.id === selectedItem.id) || selectedItem}
          watched={watched}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onClose={() => setSelectedItem(null)}
          onWatch={goWatch}
          onDeleteReview={deleteReview}
        />
      )}
      {inviteOpen && (
        <InviteModal
          currentRoom={currentRoom}
          currentRoomId={currentRoomId}
          friends={social.friends}
          showToast={showToast}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {roomsHubOpen && (
        <RoomsHubModal
          myRooms={rooms.length ? rooms : [{ id: 'marvel', name: 'Marvel' }]}
          currentRoomId={currentRoomId}
          onSelectRoom={onSelectRoom}
          onJoinPublic={joinPublicRoom}
          onOpenJoinPrivate={() => { setRoomPanelMode('join'); setRoomMsg(''); setRoomPanelOpen(true) }}
          onOpenCreate={() => { setRoomPanelMode('create'); setRoomMsg(''); setRoomPanelOpen(true) }}
          onClose={() => setRoomsHubOpen(false)}
        />
      )}
      {roomPanelOpen && (
        <RoomModal
          mode={roomPanelMode}
          onSetMode={mode => { setRoomPanelMode(mode); setRoomMsg('') }}
          onClose={() => setRoomPanelOpen(false)}
          joinName={roomJoinName} setJoinName={setRoomJoinName}
          joinCode={roomJoinCode} setJoinCode={setRoomJoinCode}
          onJoin={joinPrivateRoom}
          newName={newRoomName} setNewName={setNewRoomName}
          newCode={roomCode} setNewCode={setRoomCode}
          isGlobalAdmin={isAdmin}
          newIsPublic={newRoomPublic} setNewIsPublic={setNewRoomPublic}
          onCreate={createNewRoom}
          canDeleteCurrentRoom={canDeleteCurrentRoom}
          currentRoom={currentRoom}
          manageCode={roomManageCode} setManageCode={setRoomManageCode}
          onSaveCode={saveCurrentRoomCode}
          manageImage={roomManageImage} setManageImage={setRoomManageImage}
          onSaveImage={saveCurrentRoomImage}
          roomMembers={roomMembers}
          onKickMember={kickRoomMember}
          roomMsg={roomMsg}
        />
      )}
      {profileOpen && (
        <ProfileModal
          social={social}
          currentUser={currentUser}
          onAcceptRoomInvite={acceptRoomInvite}
          onDeclineRoomInvite={declineRoomInvite}
          voteNotice={voteApi.voteOpen && voteApi.vote ? {
            myBallot: Boolean(voteApi.myBallot),
            endsAt: voteApi.vote.ends_at,
            onGo: () => { setProfileOpen(false); setView(VIEWS.VOTE) },
          } : null}
          onClose={() => setProfileOpen(false)}
          watchlist={watchlist}
          watched={watched}
          availability={availability}
          chatMessages={chat.chatMessages}
          chatEnabled={chat.chatEnabled}
          onChatPreference={chat.setChatPreference}
          onLogout={logout}
        />
      )}
      {chat.chatPromptVisible && <ChatConsentModal onChoose={chat.setChatPreference} />}

      {/* Widgets flottants */}
      <ChatWidget chat={chat} currentRoom={currentRoom} currentUser={currentUser} avatarMap={social.avatarMap} />
      <FeedbackWidget currentRoom={currentRoom} showToast={showToast} />
      <Toast message={toast} visible={toastVisible} />
    </>
  )
}

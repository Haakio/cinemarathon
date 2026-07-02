import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'

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

// Modals & widgets
import MovieModal from '../components/modals/MovieModal'
import RoomModal from '../components/modals/RoomModal'
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
  const [roomPanelOpen, setRoomPanelOpen] = useState(false)
  const [roomPanelMode, setRoomPanelMode] = useState('join')
  const [roomMsg, setRoomMsg] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [roomJoinName, setRoomJoinName] = useState('')
  const [roomJoinCode, setRoomJoinCode] = useState('')
  const [roomManageCode, setRoomManageCode] = useState('')

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
  const voteApi = useVote({ authed, currentRoomId, currentUser, onError: showToast })

  // Pastille de notifications : patchnotes + demandes d'amis + vote en attente
  const totalUnread = social.unreadCount + (voteApi.voteOpen && !voteApi.myBallot ? 1 : 0)

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
    if (!roomCode.trim()) { setRoomMsg('Entrez un code de room.'); return }
    try {
      const room = await api('POST', '/auth/rooms', { name: newRoomName, code: roomCode })
      setRooms(prev => [...prev, room])
      setNewRoomName(''); setRoomCode(''); setRoomMsg('')
      setRoomPanelOpen(false)
      onSelectRoom(room.id)
      showToast('Room privée créée.')
    } catch (e) { setRoomMsg(e.message) }
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
          watched={watched}
          onOpenItem={openDetails}
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          onLogout={logout}
          profile={social.profile}
          unreadCount={totalUnread}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <RoomBar
          rooms={rooms}
          currentRoomId={currentRoomId}
          onSelectRoom={onSelectRoom}
          canDeleteCurrentRoom={canDeleteCurrentRoom}
          onDeleteRoom={deleteCurrentRoom}
          onLeaveRoom={leaveCurrentRoom}
          onOpenRoomPanel={() => { setRoomPanelOpen(true); setRoomMsg('') }}
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
          />

          <main className="content">
            {view === VIEWS.OVERVIEW && (
              <DashboardView
                currentRoom={currentRoom}
                currentUser={currentUser}
                watchlist={watchlist}
                watched={watched}
                availability={availability}
                chatMessages={chat.chatMessages}
                roomMembers={roomMembers}
                goal={goal}
                onSaveGoal={saveGoal}
                onWatch={goWatch}
                onOpenDetails={openDetails}
                avatarMap={social.avatarMap}
                voteApi={voteApi}
              />
            )}
            {view === VIEWS.LISTE && (
              <ListView
                currentRoom={currentRoom}
                watchlist={watchlist}
                watched={watched}
                currentUser={currentUser}
                onWatch={goWatch}
                onOpenDetails={openDetails}
              />
            )}
            {view === VIEWS.REGARDER && (
              <WatchView
                watchlist={watchlist}
                watched={watched}
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
                watched={watched}
                availability={availability}
                loadAvailability={loadAvailability}
                showToast={showToast}
              />
            )}
            {view === VIEWS.STATS && (
              <StatsView currentRoom={currentRoom} watchlist={watchlist} watched={watched} />
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
                watched={watched}
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
          onCreate={createNewRoom}
          canDeleteCurrentRoom={canDeleteCurrentRoom}
          currentRoom={currentRoom}
          manageCode={roomManageCode} setManageCode={setRoomManageCode}
          onSaveCode={saveCurrentRoomCode}
          roomMembers={roomMembers}
          onKickMember={kickRoomMember}
          roomMsg={roomMsg}
        />
      )}
      {profileOpen && (
        <ProfileModal
          social={social}
          currentUser={currentUser}
          voteNotice={voteApi.voteOpen && voteApi.vote ? {
            myBallot: Boolean(voteApi.myBallot),
            endsAt: voteApi.vote.ends_at,
            onGo: () => { setProfileOpen(false); setView(VIEWS.OVERVIEW) },
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

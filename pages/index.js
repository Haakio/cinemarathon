import Head from 'next/head'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Hooks (logique data, comportement identique à l'ancienne version)
import { usePageVisible } from '../hooks/usePageVisible'
import { useIdle } from '../hooks/useIdle'
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
import SeoLanding from '../components/views/SeoLanding'
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
import WelcomeModal from '../components/modals/WelcomeModal'
import ConfirmModal from '../components/modals/ConfirmModal'
import ProfileModal from '../components/modals/ProfileModal'
import ChatConsentModal from '../components/modals/ChatConsentModal'
import ChatWidget from '../components/widgets/ChatWidget'
import FeedbackWidget from '../components/widgets/FeedbackWidget'
import Toast from '../components/widgets/Toast'
import PopupStack from '../components/widgets/PopupStack'

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
  const [profileTab, setProfileTab] = useState('profil')
  const [selectedItem, setSelectedItem] = useState(null)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  // ── Room panel (modal) ──────────────────────────────────
  const [roomsHubOpen, setRoomsHubOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
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
  const idle = useIdle(60000)
  // "Actif" = onglet visible ET une interaction dans la dernière minute.
  // Tous les pollings s'alignent dessus : site ouvert mais inutilisé = 0 requête.
  const isActive = pageVisible && !idle

  const showToast = useCallback(msg => {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2200)
  }, [])

  // Popups de notification sociale (bas-droite, auto-fermeture 7s)
  const [popups, setPopups] = useState([])
  const pushPopup = useCallback(popup => {
    const id = Math.random().toString(36).slice(2)
    setPopups(prev => [...prev.slice(-3), { id, ...popup }])
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 7000)
  }, [])
  const dismissPopup = useCallback(id => {
    setPopups(prev => prev.filter(p => p.id !== id))
  }, [])

  // Confirmation maison (remplace window.confirm) : askConfirm(...) → Promise<bool>
  const [confirmState, setConfirmState] = useState(null)
  const askConfirm = useCallback(options => new Promise(resolve => {
    const opts = typeof options === 'string' ? { message: options } : options
    setConfirmState({ ...opts, resolve })
  }), [])
  const resolveConfirm = useCallback(answer => {
    setConfirmState(prev => {
      prev?.resolve(answer)
      return null
    })
  }, [])

  // ── Données marathon (source de vérité unique) ──────────
  const marathon = useMarathon({
    authed, currentUser, view, pageVisible: isActive,
    membersWanted: roomPanelOpen || view === VIEWS.ADMIN || view === VIEWS.OVERVIEW,
  })
  const {
    rooms, setRooms, currentRoomId, selectRoom, currentRoom,
    canDeleteCurrentRoom, canManageCurrentRoom, isAdmin,
    watchlist, watched, availability, roomMembers, setRoomMembers,
    loadData, loadAvailability, reset,
  } = marathon

  const chat = useChat({ authed, currentUser, currentRoomId, pageVisible: isActive, onError: showToast })
  const social = useSocial({
    authed, currentUser, pageVisible: isActive,
    onNotify: pushPopup, onError: showToast,
    onSessionInvalid: () => { logout(); showToast('Ce compte n\'existe plus.') },
  })
  const voteApi = useVote({ authed, currentRoomId, currentUser, view, pageVisible: isActive, onError: showToast })

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

  // Mot de bienvenue du créateur : une seule fois, à la première connexion
  useEffect(() => {
    if (!authed || !currentUser?.id) return
    if (localStorage.getItem(`cm_welcome_${currentUser.id}`) !== '1') setWelcomeOpen(true)
  }, [authed, currentUser])

  function closeWelcome() {
    if (currentUser?.id) localStorage.setItem(`cm_welcome_${currentUser.id}`, '1')
    setWelcomeOpen(false)
  }

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

  // ── Reprise du carrousel "Regarder" ─────────────────────
  // Le film courant est mémorisé par room (localStorage) : après un
  // refresh, on reprend là où on s'était arrêté, pas au premier de la liste.
  const setWatchIdxPersist = useCallback(idx => {
    setWatchIdx(idx)
    const item = watchlist[idx]
    if (item) localStorage.setItem(`cm_watch_item_${currentRoomId}`, item.id)
  }, [watchlist, currentRoomId])

  const restoredRoomRef = useRef(null)
  useEffect(() => {
    if (!watchlist.length) return
    if (restoredRoomRef.current === currentRoomId) return
    const savedId = localStorage.getItem(`cm_watch_item_${currentRoomId}`)
    if (!savedId) {
      restoredRoomRef.current = currentRoomId
      return
    }
    const idx = watchlist.findIndex(w => w.id === savedId)
    // Si le film n'est pas dans la liste, c'est peut-être encore celle de
    // l'ancienne room : on retentera au prochain chargement.
    if (idx >= 0) {
      setWatchIdx(idx)
      restoredRoomRef.current = currentRoomId
    }
  }, [watchlist, currentRoomId])

  const goWatch = useCallback(id => {
    const idx = watchlist.findIndex(w => w.id === id)
    if (idx >= 0) {
      setWatchIdxPersist(idx)
      setView(VIEWS.REGARDER)
      setSelectedItem(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [watchlist, setWatchIdxPersist])

  const openDetails = useCallback(item => setSelectedItem(item), [])

  function onSelectRoom(roomId) {
    selectRoom(roomId)
    setWatchIdx(0)
  }

  async function deleteReview(id) {
    if (!(await askConfirm({ title: 'Supprimer cet avis', message: 'Cette note et ce commentaire seront définitivement supprimés.', confirmLabel: 'Supprimer', danger: true }))) return
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
    if (!(await askConfirm({ title: `Supprimer ${room.name}`, message: 'La room et TOUTES ses données (films, notes, chat, votes...) seront définitivement supprimées.', confirmLabel: 'Supprimer la room', danger: true }))) return
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
    if (!(await askConfirm({ title: `Quitter ${room.name}`, message: 'Vous pourrez la rejoindre à nouveau avec le code ou une invitation.', confirmLabel: 'Quitter la room' }))) return
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
    if (!(await askConfirm({ title: `Retirer ${member.pseudo || 'ce membre'}`, message: `Il sera retiré de ${currentRoom.name} (il pourra revenir avec le code ou une invitation).`, confirmLabel: 'Retirer', danger: true }))) return
    try {
      await api('POST', '/auth/rooms', { action: 'kick', roomId: currentRoomId, targetUserId: member.user_id })
      setRoomMembers(prev => prev.filter(entry => entry.user_id !== member.user_id))
      showToast('Membre retiré.')
    } catch (e) { setRoomMsg(e.message) }
  }

  // ── Rendu ───────────────────────────────────────────────
  const head = (
    <Head>
      <title>Cinémarathon — Organisez vos marathons de films entre amis</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
        name="description"
        content="Créez votre salle, ajoutez vos films, votez pour la prochaine séance, suivez votre progression et débattez entre amis. Le site qui transforme vos soirées en vrais marathons ciné."
      />
      {/* Aperçus Google / Discord / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Cinémarathon" />
      <meta property="og:title" content="Cinémarathon — Le marathon entre amis" />
      <meta
        property="og:description"
        content="Listes de films, votes de séance, progression, notes, discussions : organisez vos marathons et vos soirées ciné entre amis."
      />
      <meta property="og:image" content="/og.png" />
      <meta name="twitter:card" content="summary_large_image" />
      {/* Adresse officielle : évite que le domaine vercel.app soit indexé à la place */}
      <link rel="canonical" href="https://xn--cinmarathon-dbb.com/" />
    </Head>
  )

  // Avant le montage client (= ce que Google indexe côté serveur) :
  // on rend la présentation publique, pas un écran vide.
  if (!mounted) return (
    <>
      {head}
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <SeoLanding />
      </div>
    </>
  )

  if (!authed) return (
    <>
      {head}
      <AuthScreen onAuthed={onAuthed} />
      <SeoLanding />
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
          onOpenProfile={() => { setProfileTab('profil'); setProfileOpen(true) }}
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
                setWatchIdx={setWatchIdxPersist}
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
                askConfirm={askConfirm}
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
                askConfirm={askConfirm}
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
          initialTab={profileTab}
          isGlobalAdmin={isAdmin}
          showToast={showToast}
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
      {welcomeOpen && (
        <WelcomeModal
          adminPseudo={process.env.NEXT_PUBLIC_ADMIN_PSEUDO || 'Haakio'}
          adminAvatar={social.avatarMap[(process.env.NEXT_PUBLIC_ADMIN_PSEUDO || '').toLowerCase()]}
          onClose={closeWelcome}
        />
      )}
      {chat.chatPromptVisible && !welcomeOpen && <ChatConsentModal onChoose={chat.setChatPreference} />}

      {/* Widgets flottants */}
      <ChatWidget chat={chat} currentRoom={currentRoom} currentUser={currentUser} avatarMap={social.avatarMap} />
      <FeedbackWidget currentRoom={currentRoom} showToast={showToast} />
      <PopupStack
        popups={popups}
        onOpen={popup => {
          dismissPopup(popup.id)
          setProfileTab(popup.tab || 'notifications')
          setProfileOpen(true)
        }}
        onDismiss={dismissPopup}
      />
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={() => resolveConfirm(true)}
          onCancel={() => resolveConfirm(false)}
        />
      )}
      <Toast message={toast} visible={toastVisible} />
    </>
  )
}

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
import MyRatingsView from '../components/views/MyRatingsView'
import AdminView from '../components/views/AdminView'
import DiscussionsView from '../components/views/DiscussionsView'
import VoteView from '../components/views/VoteView'
import ModerationView from '../components/views/ModerationView'

// Modals & widgets
import MovieModal from '../components/modals/MovieModal'
import RoomModal from '../components/modals/RoomModal'
import RoomSettingsModal from '../components/modals/RoomSettingsModal'
import RoomsHubModal from '../components/modals/RoomsHubModal'
import InviteModal from '../components/modals/InviteModal'
import WelcomeModal from '../components/modals/WelcomeModal'
import ConfirmModal from '../components/modals/ConfirmModal'
import ProfileModal from '../components/modals/ProfileModal'
import ChatConsentModal from '../components/modals/ChatConsentModal'
import AdminPanelModal from '../components/modals/AdminPanelModal'
import ChatWidget from '../components/widgets/ChatWidget'
import FeedbackWidget from '../components/widgets/FeedbackWidget'
import Toast from '../components/widgets/Toast'
import PopupStack from '../components/widgets/PopupStack'
import UrgentAlert from '../components/widgets/UrgentAlert'
import AppealChat from '../components/widgets/AppealChat'

// Utils
import { api, clearSession, getStoredUser, getToken, saveSession } from '../utils/api'
import { VIEWS } from '../utils/constants'
import { sortByMode } from '../lib/mcuChrono'
import { getNextItem } from '../utils/stats'

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
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
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
  const [roomManageName, setRoomManageName] = useState('')

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
    membersWanted: roomPanelOpen || roomSettingsOpen || view === VIEWS.ADMIN || view === VIEWS.OVERVIEW,
  })
  const {
    rooms, setRooms, currentRoomId, selectRoom, currentRoom,
    canDeleteCurrentRoom, canManageCurrentRoom, isAdmin,
    watchlist, watched, availability, roomMembers, setRoomMembers,
    loadData, loadAvailability, reset,
  } = marathon

  // Confidentialité de mes notes : masquage par room + raccourci "toutes les rooms publiques"
  const [ratingVisibility, setRatingVisibility] = useState({ hidePublic: false, hiddenRoomIds: [] })
  useEffect(() => {
    if (!authed) return
    api('GET', '/auth/rating-visibility').then(setRatingVisibility).catch(() => {})
  }, [authed])

  const setHidePublicRatings = useCallback(async hidden => {
    try {
      const prefs = await api('POST', '/auth/rating-visibility', { scope: 'public', hidden })
      setRatingVisibility(prefs)
    } catch (e) { showToast(e.message || 'Impossible de mettre à jour ce réglage.') }
  }, [showToast])

  const setRoomRatingHidden = useCallback(async (roomId, hidden) => {
    try {
      const prefs = await api('POST', '/auth/rating-visibility', { scope: 'room', roomId, hidden })
      setRatingVisibility(prefs)
    } catch (e) { showToast(e.message || 'Impossible de mettre à jour ce réglage.') }
  }, [showToast])

  async function deleteMyAccount(confirmText) {
    if (!(await askConfirm({
      title: 'Supprimer mon compte',
      message: 'SUPPRESSION DÉFINITIVE : votre compte, vos notes, messages, amitiés, votes, posts et vos rooms privées. Aucun retour en arrière possible.',
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    }))) return
    try {
      await api('POST', '/auth/delete-my-account', { confirm: confirmText })
      showToast('Compte supprimé.')
      logout()
    } catch (e) { showToast(e.message || 'Impossible de supprimer le compte.') }
  }

  const chat = useChat({ authed, currentUser, currentRoomId, pageVisible: isActive, onError: showToast })
  // Alerte de modération : plein écran + son (public/sounds/alert.mp3)
  const [urgentAlert, setUrgentAlert] = useState(null)
  const handleUrgent = useCallback(modCase => {
    setUrgentAlert(modCase)
    try {
      const audio = new Audio('/sounds/alert.mp3')
      audio.volume = 0.7
      audio.play().catch(() => { }) // silencieux si fichier absent / autoplay bloqué
    } catch { }
  }, [])

  const social = useSocial({
    authed, currentUser, pageVisible: isActive,
    onNotify: pushPopup, onUrgent: handleUrgent, onError: showToast,
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

  // Staff = admin du site OU modérateur nommé (épée verte)
  const isStaff = isAdmin || Boolean(social.profile?.moderator)

  // Compte suspendu par la modération : écran bloquant immédiat
  // (déclenché par une réponse 451, confirmé par le profil serveur)
  const [justBlocked, setJustBlocked] = useState(false)
  useEffect(() => {
    const handler = () => setJustBlocked(true)
    window.addEventListener('cm-blocked', handler)
    return () => window.removeEventListener('cm-blocked', handler)
  }, [])
  const isSuspended = authed && (justBlocked || social.profile?.blocked || social.profile?.banned)

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

  // ── Objectif du marathon (partagé, stocké en base par room) ──
  const goal = currentRoom.goal_label && currentRoom.goal_date
    ? { label: currentRoom.goal_label, date: currentRoom.goal_date }
    : null

  const saveGoal = useCallback(async next => {
    try {
      await api('PATCH', '/auth/rooms', { roomId: currentRoomId, goal: next })
      setRooms(prev => prev.map(room => room.id === currentRoomId
        ? { ...room, goal_label: next?.label || '', goal_date: next?.date || '' }
        : room))
      showToast(next ? 'Objectif défini 🎯' : 'Objectif supprimé.')
    } catch (e) { showToast(e.message) }
  }, [currentRoomId, showToast, setRooms])

  const deleteGoal = useCallback(() => saveGoal(null), [saveGoal])

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

  // ── Ordre d'affichage/visionnage (Liste + Regarder) ─────
  // "Ordre chronologique" par défaut, ou "MCU (chrono)" si l'utilisateur
  // l'a choisi — mémorisé par room pour ne PAS revenir tout seul à
  // l'ordre chronologique tant qu'il ne re-clique pas dessus.
  const [listSort, setListSortState] = useState('marathon')
  useEffect(() => {
    setListSortState(localStorage.getItem(`cm_sort_${currentRoomId}`) || 'marathon')
  }, [currentRoomId])
  const setListSort = useCallback(value => {
    setListSortState(value)
    localStorage.setItem(`cm_sort_${currentRoomId}`, value)
    // Bascule "Regarder" sur le premier titre PAS ENCORE VU dans ce nouvel
    // ordre — pas sur le tout premier si on a déjà avancé dans le marathon.
    const reordered = sortByMode(watchlist, value)
    const nextItem = getNextItem(reordered, seenSource)
    const idx = nextItem ? reordered.findIndex(w => w.id === nextItem.id) : 0
    setWatchIdx(idx)
    if (reordered[idx]) localStorage.setItem(`cm_watch_item_${currentRoomId}`, reordered[idx].id)
  }, [currentRoomId, watchlist, seenSource])

  // Liste utilisée par "Regarder" : le marathon dans l'ordre actuellement
  // choisi (chronologique ou MCU), pour que le premier film proposé change
  // avec le mode sélectionné au lieu de toujours démarrer sur l'ordre DB.
  const watchOrderList = useMemo(() => sortByMode(watchlist, listSort), [watchlist, listSort])

  // ── Reprise du carrousel "Regarder" ─────────────────────
  // Le film courant est mémorisé par room (localStorage) : après un
  // refresh, on reprend là où on s'était arrêté, pas au premier de la liste.
  const setWatchIdxPersist = useCallback(idx => {
    setWatchIdx(idx)
    const item = watchOrderList[idx]
    if (item) localStorage.setItem(`cm_watch_item_${currentRoomId}`, item.id)
  }, [watchOrderList, currentRoomId])

  const restoredKeyRef = useRef(null)
  useEffect(() => {
    if (!watchOrderList.length) return
    const key = `${currentRoomId}:${listSort}`
    if (restoredKeyRef.current === key) return
    const savedId = localStorage.getItem(`cm_watch_item_${currentRoomId}`)
    if (!savedId) {
      restoredKeyRef.current = key
      return
    }
    const idx = watchOrderList.findIndex(w => w.id === savedId)
    // Si le film n'est pas dans la liste, c'est peut-être encore celle de
    // l'ancienne room : on retentera au prochain chargement.
    if (idx >= 0) {
      setWatchIdx(idx)
      restoredKeyRef.current = key
    }
  }, [watchOrderList, currentRoomId, listSort])

  const goWatch = useCallback(id => {
    const idx = watchOrderList.findIndex(w => w.id === id)
    if (idx >= 0) {
      setWatchIdxPersist(idx)
      setView(VIEWS.REGARDER)
      setSelectedItem(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [watchOrderList, setWatchIdxPersist])

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

  // Pré-remplit nom et image avec ceux de la room courante
  useEffect(() => {
    if (roomSettingsOpen) {
      setRoomManageImage(currentRoom.image || '')
      setRoomManageName(currentRoom.name || '')
    }
  }, [roomSettingsOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCurrentRoomName() {
    const name = roomManageName.trim()
    if (name.length < 2) { setRoomMsg('Nom trop court (min 2 caractères).'); return }
    try {
      await api('PATCH', '/auth/rooms', { roomId: currentRoomId, name })
      setRooms(prev => prev.map(room => room.id === currentRoomId ? { ...room, name } : room))
      setRoomMsg('')
      showToast('Room renommée ✓')
    } catch (e) { setRoomMsg(e.message) }
  }

  // Droits sur les réglages de room : créateur, ou admin du site pour Marvel
  const canManageRoomSettings = canDeleteCurrentRoom || (currentRoom.id === 'marvel' && isAdmin)

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
      <title>Cinémarathon — Le site pour organiser un marathon de films entre amis</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
        name="description"
        content="Le site gratuit pour organiser un marathon de films, séries ou animes entre amis : marathon Marvel, Harry Potter, Star Wars... Listes, ordre chronologique, votes, calendrier de dispos et notes."
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
      {/* Données structurées : aide Google à comprendre le site (rich results potentiels) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: 'Cinémarathon',
            url: 'https://xn--cinmarathon-dbb.com/',
          },
          {
            '@type': 'WebApplication',
            name: 'Cinémarathon',
            url: 'https://xn--cinmarathon-dbb.com/',
            description: 'Le site gratuit pour organiser un marathon de films, séries ou animes entre amis : listes, ordre chronologique, votes, calendrier de dispos et notes.',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          },
        ],
      }) }} />
    </Head>
  )

  // Avant le montage client : splash plein écran (ce que l'utilisateur voit
  // ~1s), avec la présentation publique SOUS la ligne de flottaison — elle
  // reste dans le HTML pour Google sans flasher à l'écran.
  if (!mounted) return (
    <>
      {head}
      <div className="boot-splash">
        <div className="boot-splash-logo">CINÉMARATHON</div>
      </div>
      <SeoLanding />
    </>
  )

  if (!authed) return (
    <>
      {head}
      <AuthScreen onAuthed={onAuthed} />
      <SeoLanding />
    </>
  )

  // Écran de suspension : rien d'autre n'est accessible
  if (isSuspended) return (
    <>
      {head}
      <div className="blocked-screen">
        <div className="blocked-box">
          <div className="blocked-icon">⛔</div>
          <h1>{social.profile?.banned ? 'Compte banni' : 'Compte suspendu'}</h1>
          <p>
            {social.profile?.banned
              ? 'Votre compte a été banni de Cinémarathon suite à des propos interdits.'
              : 'Un de vos messages a enfreint les règles (propos haineux). Il n\'a pas été publié et votre compte est suspendu le temps que l\'administrateur examine la situation.'}
          </p>
          <div className="appeal-intro">💬 La modération va discuter avec vous — vous pouvez vous expliquer ici :</div>
          <AppealChat placeholder="Expliquez le contexte..." />
          <button className="btn-ghost" style={{ width: 'auto', marginTop: '16px' }} onClick={() => { setJustBlocked(false); logout() }}>
            Se déconnecter
          </button>
        </div>
      </div>
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
          isSiteAdmin={isStaff}
          onOpenAdminPanel={() => setAdminPanelOpen(true)}
          modBadgeCount={social.pendingModCount}
        />

        <RoomBar
          currentRoom={currentRoom}
          onOpenHub={() => setRoomsHubOpen(true)}
          canManageCurrentRoom={canManageRoomSettings}
          onOpenSettings={() => { setRoomMsg(''); setRoomSettingsOpen(true) }}
          canDeleteCurrentRoom={canDeleteCurrentRoom}
          onDeleteRoom={deleteCurrentRoom}
          onLeaveRoom={leaveCurrentRoom}
          roomMsg={!roomPanelOpen && !roomSettingsOpen ? roomMsg : ''}
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
            isSiteAdmin={isStaff}
            modCount={social.pendingModCount}
          />

          <main className="content">
            {view === VIEWS.OVERVIEW && (
              <DashboardView
                currentRoom={currentRoom}
                currentUser={currentUser}
                watchlist={watchlist}
                watchOrder={watchOrderList}
                watched={watched}
                seenSource={seenSource}
                availability={availability}
                chatMessages={chat.chatMessages}
                roomMembers={roomMembers}
                goal={goal}
                onSaveGoal={saveGoal}
                onDeleteGoal={deleteGoal}
                canManageGoal={canManageCurrentRoom}
                onWatch={goWatch}
                onOpenDetails={openDetails}
                avatarMap={social.avatarMap}
                friends={social.friends}
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
                sort={listSort}
                onSetSort={setListSort}
              />
            )}
            {view === VIEWS.REGARDER && (
              <WatchView
                watchlist={watchOrderList}
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
            {view === VIEWS.MES_NOTES && (
              <MyRatingsView showToast={showToast} />
            )}
            {view === VIEWS.DISCUSSIONS && (
              <DiscussionsView
                currentRoom={currentRoom}
                currentRoomId={currentRoomId}
                currentUser={currentUser}
                isAdmin={isAdmin}
                isModerator={Boolean(social.avatarMap[currentUser?.id]?.moderator)}
                watchlist={watchlist}
                showToast={showToast}
                askConfirm={askConfirm}
                avatarMap={social.avatarMap}
              />
            )}
            {view === VIEWS.MODERATION && isStaff && (
              <ModerationView social={social} avatarMap={social.avatarMap} isAdmin={isAdmin} />
            )}
            {view === VIEWS.ADMIN && canManageCurrentRoom && (
              <AdminView
                currentRoom={currentRoom}
                currentRoomId={currentRoomId}
                watchlist={watchlist}
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
          canManage={canManageCurrentRoom}
          currentRoomId={currentRoomId}
          loadData={loadData}
          showToast={showToast}
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
          roomMsg={roomMsg}
        />
      )}
      {roomSettingsOpen && (
        <RoomSettingsModal
          currentRoom={currentRoom}
          onClose={() => setRoomSettingsOpen(false)}
          manageName={roomManageName} setManageName={setRoomManageName}
          onSaveName={saveCurrentRoomName}
          manageImage={roomManageImage} setManageImage={setRoomManageImage}
          onSaveImage={saveCurrentRoomImage}
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
          rooms={rooms}
          ratingVisibility={ratingVisibility}
          onSetHidePublicRatings={setHidePublicRatings}
          onSetRoomRatingHidden={setRoomRatingHidden}
          onDeleteAccount={deleteMyAccount}
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
      {adminPanelOpen && (
        <AdminPanelModal
          social={social}
          isAdmin={isAdmin}
          showToast={showToast}
          askConfirm={askConfirm}
          onGoModeration={() => { setAdminPanelOpen(false); setView(VIEWS.MODERATION) }}
          onClose={() => setAdminPanelOpen(false)}
        />
      )}
      {chat.chatPromptVisible && !welcomeOpen && <ChatConsentModal onChoose={chat.setChatPreference} />}

      {/* Widgets flottants */}
      <ChatWidget chat={chat} currentRoom={currentRoom} currentUser={currentUser} avatarMap={social.avatarMap} />
      <FeedbackWidget currentRoom={currentRoom} showToast={showToast} />
      <UrgentAlert
        alert={urgentAlert}
        onView={() => { setUrgentAlert(null); setView(VIEWS.MODERATION) }}
        onDismiss={() => setUrgentAlert(null)}
      />
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

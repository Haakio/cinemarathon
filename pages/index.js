import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { patchnotes } from '../lib/patchnotes'

// ─── API helpers ───────────────────────────────────────────
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('cm_token') : null }
function getUser() { try { return JSON.parse(localStorage.getItem('cm_user')) } catch { return null } }
function saveSession(token, user) { localStorage.setItem('cm_token', token); localStorage.setItem('cm_user', JSON.stringify(user)) }
function clearSession() { localStorage.removeItem('cm_token'); localStorage.removeItem('cm_user') }
function getRoom() { return typeof window !== 'undefined' ? localStorage.getItem('cm_room') || 'marvel' : 'marvel' }
function saveRoom(roomId) { localStorage.setItem('cm_room', roomId) }
function getChatPref(userId) { return typeof window !== 'undefined' ? localStorage.getItem(`cm_chat_pref_${userId}`) : null }
function saveChatPref(userId, value) { localStorage.setItem(`cm_chat_pref_${userId}`, value) }
function getPatchPref(userId) { return typeof window !== 'undefined' ? localStorage.getItem(`cm_patchnotes_${userId}`) : null }
function savePatchPref(userId) { localStorage.setItem(`cm_patchnotes_${userId}`, patchnotes.version) }

const cinemaSlots = [
  { key: 'prime', label: '20h30', vibe: 'Séance principale' },
  { key: 'second', label: '21h30', vibe: 'Deuxième séance' },
  { key: 'late', label: '22h30', vibe: 'Late show' },
]

function getCinemaDays() {
  if (typeof window === 'undefined') return []
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    const key = date.toISOString().slice(0, 10)
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    return { key, label }
  })
}

async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data
}

// ─── App ───────────────────────────────────────────────────
export default function App() {
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authTab, setAuthTab] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [page, setPage] = useState('liste')
  const [rooms, setRooms] = useState([])
  const [currentRoomId, setCurrentRoomId] = useState('marvel')
  const [newRoomName, setNewRoomName] = useState('')
  const [roomMsg, setRoomMsg] = useState('')
  const [watchlist, setWatchlist] = useState([])
  const [watched, setWatched] = useState([])
  const [loading, setLoading] = useState(false)

  const [watchIdx, setWatchIdx] = useState(0)
  const [currentRating, setCurrentRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  const [listeFilter, setListeFilter] = useState('all')
  const [vuFilter, setVuFilter] = useState('all')

  const [addTitle, setAddTitle] = useState('')
  const [addType, setAddType] = useState('film')
  const [addPoster, setAddPoster] = useState('')
  const [addYear, setAddYear] = useState('')
  const [addPlatform, setAddPlatform] = useState('')
  const [addWatchUrl, setAddWatchUrl] = useState('')
  const [addMsg, setAddMsg] = useState('')

  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(false)
  const [chatPromptVisible, setChatPromptVisible] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatTypingUsers, setChatTypingUsers] = useState([])
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('Idée')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [patchnotesOpen, setPatchnotesOpen] = useState(false)
  const [availability, setAvailability] = useState([])
  const [availabilityPreference, setAvailabilityPreference] = useState('any')
  const [secretUnlocked, setSecretUnlocked] = useState(false)
  const [secretPassword, setSecretPassword] = useState('')
  const [secretError, setSecretError] = useState('')

  const isAdmin = currentUser?.pseudo === process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  const [editingId, setEditingId] = useState(null)

  useEffect(() => { setMounted(true) }, [])

  // Restore session
  useEffect(() => {
    const user = getUser()
    const token = getToken()
    if (user && token) { setCurrentUser(user); setAuthed(true) }
    setCurrentRoomId(getRoom())
  }, [])

  const loadRooms = useCallback(async () => {
    if (!authed) return
    try {
      const data = await api('GET', '/auth/rooms')
      setRooms(data)
      if (data.length && !data.some(room => room.id === currentRoomId)) {
        setCurrentRoomId(data[0].id)
        saveRoom(data[0].id)
      }
    } catch { }
  }, [authed, currentRoomId])

  const loadData = useCallback(async () => {
    if (!authed || !currentRoomId) return
    setLoading(true)
    try {
      const roomQuery = `roomId=${encodeURIComponent(currentRoomId)}`
      const [wl, wd] = await Promise.all([api('GET', `/auth/watchlist?${roomQuery}`), api('GET', `/auth/watchlist/watched?${roomQuery}`)])
      setWatchlist(wl)
      setWatched(wd)
    } catch { }
    setLoading(false)
  }, [authed, currentRoomId])

  const loadAvailability = useCallback(async () => {
    if (!authed || !currentRoomId) return
    try {
      const roomQuery = `roomId=${encodeURIComponent(currentRoomId)}`
      const entries = await api('GET', `/auth/availability?${roomQuery}`)
      setAvailability(entries)
    } catch { }
  }, [authed, currentRoomId])

  useEffect(() => { if (authed) loadRooms() }, [authed, loadRooms])
  useEffect(() => { if (authed) loadData() }, [authed, loadData])
  useEffect(() => { if (authed) loadAvailability() }, [authed, loadAvailability])

  useEffect(() => {
    if (!authed || !currentUser?.id) return
    const pref = getChatPref(currentUser.id)
    if (!pref) {
      setChatPromptVisible(true)
      setChatEnabled(false)
      return
    }
    setChatEnabled(pref === 'enabled')
  }, [authed, currentUser])

  useEffect(() => {
    if (!authed || !currentUser?.id) return
    if (getPatchPref(currentUser.id) !== patchnotes.version) {
      setPatchnotesOpen(true)
    }
  }, [authed, currentUser])

  const loadChat = useCallback(async () => {
    if (!authed || !chatEnabled || !currentRoomId) return
    const roomQuery = `roomId=${encodeURIComponent(currentRoomId)}`
    try {
      const [messages, typing] = await Promise.all([
        api('GET', `/auth/chat?${roomQuery}`),
        api('GET', `/auth/chat/typing?${roomQuery}`),
      ])
      setChatMessages(messages)
      setChatTypingUsers(typing)
    } catch { }
  }, [authed, chatEnabled, currentRoomId])

  useEffect(() => {
    if (!chatEnabled) return
    loadChat()
    const timer = setInterval(loadChat, chatOpen ? 2500 : 6000)
    return () => clearInterval(timer)
  }, [chatEnabled, chatOpen, loadChat])

  useEffect(() => {
    setChatMessages([])
    setChatTypingUsers([])
  }, [currentRoomId])

  useEffect(() => {
    if (!chatEnabled || !chatOpen || !chatInput.trim() || !currentRoomId) return
    const roomId = currentRoomId
    api('POST', '/auth/chat/typing', { roomId, isTyping: true }).catch(() => { })
    const timer = setTimeout(() => {
      api('POST', '/auth/chat/typing', { roomId, isTyping: false }).catch(() => { })
    }, 1500)
    return () => clearTimeout(timer)
  }, [chatInput, chatEnabled, chatOpen, currentRoomId])

  // Reload watched/watchlist when switching pages
  useEffect(() => { if (authed) loadData() }, [page])
  useEffect(() => { if (authed && page === 'dispos') loadAvailability() }, [page, authed, loadAvailability])
  useEffect(() => {
    if (!authed || page !== 'dispos') return
    loadAvailability()
    const timer = setInterval(loadAvailability, 2500)
    return () => clearInterval(timer)
  }, [authed, page, loadAvailability])

  // Load current watch state when watchIdx or watchlist changes
  useEffect(() => {
    if (!watchlist.length) return
    const item = watchlist[watchIdx]
    if (!item) return
    const myEntry = watched.find(w => w.item_id === item.id && w.user_id === currentUser?.id)
    setCurrentRating(myEntry ? myEntry.rating : 0)
    setComment(myEntry ? (myEntry.comment || '') : '')
  }, [watchIdx, watchlist, watched, currentUser])

  function showToast(msg) {
    setToast(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2200)
  }

  function selectRoom(roomId) {
    setCurrentRoomId(roomId)
    saveRoom(roomId)
    setWatchIdx(0)
    cancelEdit()
  }

  function toggleSettings() {
    setSettingsOpen(open => !open)
  }

  function closePatchnotes() {
    if (currentUser?.id) savePatchPref(currentUser.id)
    setPatchnotesOpen(false)
  }

  function unlockSecret() {
    if (secretPassword === 'azertypoppop') {
      setSecretUnlocked(true)
      setSecretPassword('')
      setSecretError('')
      return
    }

    setSecretError('Mot de passe incorrect.')
  }

  function setChatPreference(enabled) {
    if (!currentUser?.id) return
    saveChatPref(currentUser.id, enabled ? 'enabled' : 'disabled')
    setChatEnabled(enabled)
    setChatPromptVisible(false)
    setChatOpen(enabled)
    if (!enabled) {
      setChatMessages([])
      setChatTypingUsers([])
      setChatOpen(false)
    }
  }

  async function sendChatMessage() {
    const message = chatInput.trim()
    if (!message) return
    try {
      await api('POST', '/auth/chat', { roomId: currentRoomId, message })
      await api('POST', '/auth/chat/typing', { roomId: currentRoomId, isTyping: false })
      setChatInput('')
      loadChat()
    } catch (e) {
      showToast('Erreur chat: ' + e.message)
    }
  }

  async function sendFeedback() {
    const message = feedbackMessage.trim()
    if (!message) {
      showToast('Écris ton retour avant d’envoyer.')
      return
    }

    setFeedbackLoading(true)
    try {
      await api('POST', '/auth/feedback', {
        type: feedbackType,
        message,
        roomName: currentRoom.name,
      })
      setFeedbackMessage('')
      setFeedbackOpen(false)
      showToast('Retour envoyé, merci !')
    } catch (e) {
      showToast('Erreur retour: ' + e.message)
    }
    setFeedbackLoading(false)
  }

  async function toggleAvailability(day, slot) {
    const alreadyAvailable = availability.some(entry =>
      entry.user_id === currentUser?.id &&
      entry.day_key === day.key &&
      entry.slot_key === slot.key
    )

    try {
      await api('POST', '/auth/availability', {
        roomId: currentRoomId,
        dayKey: day.key,
        slotKey: slot.key,
        slotLabel: `${day.label} ${slot.label}`,
        preference: availabilityPreference,
        available: !alreadyAvailable,
      })
      loadAvailability()
    } catch (e) {
      showToast('Erreur dispos: ' + e.message)
    }
  }

  // ─── AUTH ───────────────────────────────────────────────
  async function login() {
    const pseudo = document.getElementById('login-pseudo').value.trim()
    const password = document.getElementById('login-password').value
    if (!pseudo || !password) { setAuthError('Remplissez tous les champs.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const data = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo, password }) })
      const json = await data.json()
      if (!data.ok) { setAuthError(json.error); setAuthLoading(false); return }
      saveSession(json.token, json.user)
      setCurrentUser(json.user); setAuthed(true)
    } catch { setAuthError('Erreur de connexion') }
    setAuthLoading(false)
  }

  async function register() {
    const pseudo = document.getElementById('reg-pseudo').value.trim()
    const password = document.getElementById('reg-password').value
    const confirm = document.getElementById('reg-confirm').value
    if (!pseudo || !password) { setAuthError('Remplissez tous les champs.'); return }
    if (password !== confirm) { setAuthError('Les mots de passe ne correspondent pas.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const data = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo, password }) })
      const json = await data.json()
      if (!data.ok) { setAuthError(json.error); setAuthLoading(false); return }
      saveSession(json.token, json.user)
      setCurrentUser(json.user); setAuthed(true)
    } catch { setAuthError('Erreur de connexion') }
    setAuthLoading(false)
  }

  function logout() {
    clearSession()
    setAuthed(false)
    setCurrentUser(null)
    setWatchlist([])
    setWatched([])
    setChatOpen(false)
    setChatEnabled(false)
    setChatMessages([])
    setChatTypingUsers([])
    setSettingsOpen(false)
    setPatchnotesOpen(false)
  }

  // ─── ADMIN ──────────────────────────────────────────────
  async function addItem() {
    if (!addTitle.trim()) { setAddMsg('error:Entrez un titre.'); return }
    try {
      await api('POST', '/auth/watchlist', { roomId: currentRoomId, title: addTitle, type: addType, poster: addPoster, year: addYear, platform: addPlatform, watchUrl: addWatchUrl })
      setAddTitle(''); setAddPoster(''); setAddYear(''); setAddPlatform(''); setAddWatchUrl(''); setAddMsg('ok:Ajouté !')
      setTimeout(() => setAddMsg(''), 2500)
      loadData()
    } catch (e) { setAddMsg('error:' + e.message) }
  }

  async function deleteItem(id) {
    if (!confirm('Supprimer ce titre ?')) return
    try { await api('DELETE', `/auth/watchlist/${id}`); loadData(); showToast('Supprimé.') } catch { }
  }

  async function moveItem(id, dir) {
    try { await api('PUT', `/auth/watchlist/${id}`, { roomId: currentRoomId, dir }); loadData() } catch { }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setAddTitle(item.title)
    setAddType(item.type)
    setAddPoster(item.poster || '')
    setAddYear(item.year || '')
    setAddPlatform(item.platform || '')
    setAddWatchUrl(item.watch_url || '')
    setAddMsg('')
  }

  function cancelEdit() {
    setEditingId(null)
    setAddTitle('')
    setAddType('film')
    setAddPoster('')
    setAddYear('')
    setAddPlatform('')
    setAddWatchUrl('')
    setAddMsg('')
  }

  async function saveEdit() {
    if (!addTitle.trim()) {
      setAddMsg('error:Entrez un titre.')
      return
    }

    try {
      await api('PUT', `/auth/watchlist/${editingId}`, {
        roomId: currentRoomId,
        title: addTitle,
        type: addType,
        poster: addPoster,
        year: addYear,
        platform: addPlatform,
        watchUrl: addWatchUrl,
      })

      setAddMsg('ok:Modifié !')
      cancelEdit()
      loadData()
    } catch (e) {
      setAddMsg('error:' + e.message)
    }
  }

  async function createNewRoom() {
    if (!newRoomName.trim()) {
      setRoomMsg('Entrez un nom de room.')
      return
    }

    try {
      const room = await api('POST', '/auth/rooms', { name: newRoomName })
      setRooms(prev => [...prev, room])
      setNewRoomName('')
      setRoomMsg('')
      selectRoom(room.id)
      showToast('Room creee.')
    } catch (e) {
      setRoomMsg(e.message)
    }
  }

  // ─── REGARDER ───────────────────────────────────────────
  async function markWatched() {
    if (!currentRating) { showToast('Attribuez d\'abord une note !'); return }
    const item = watchlist[watchIdx]
    try {
      await api('POST', '/auth/watchlist/watched', { roomId: currentRoomId, itemId: item.id, rating: currentRating, comment })
      showToast('✓ Enregistré !')
      loadData()
    } catch (e) { showToast('Erreur: ' + e.message) }
  }

  async function saveAndNext() {
    if (currentRating > 0 || comment.trim()) await markWatched()
    if (watchIdx < watchlist.length - 1) { setWatchIdx(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    else showToast('🎉 Marathon terminé !')
  }

  function goWatch(id) {
    const idx = watchlist.findIndex(w => w.id === id)
    if (idx >= 0) { setWatchIdx(idx); setPage('regarder') }
  }

  async function deleteReview(id) {
    if (!confirm('Supprimer cet avis ?')) return

    try {
      await api('DELETE', '/auth/watchlist/watched', { id })
      showToast('Avis supprimé.')
      loadData()
    } catch (e) {
      showToast('Erreur: ' + e.message)
    }
  }

  // ─── DERIVED ────────────────────────────────────────────
  const seenItemIds = [...new Set(watched.map(w => w.item_id))]

  let listeItems = [...watchlist]
  if (listeFilter === 'film') listeItems = listeItems.filter(i => i.type === 'film')
  if (listeFilter === 'serie') listeItems = listeItems.filter(i => i.type === 'serie')
  if (listeFilter === 'seen') listeItems = listeItems.filter(i => seenItemIds.includes(i.id))
  if (listeFilter === 'unseen') listeItems = listeItems.filter(i => !seenItemIds.includes(i.id))

  let vuEntries = [...watched]
  if (vuFilter === 'me') vuEntries = vuEntries.filter(e => e.user_id === currentUser?.id)

  const groupedVuEntries = vuEntries.reduce((acc, entry) => {
    if (!acc[entry.item_id]) acc[entry.item_id] = []
    acc[entry.item_id].push(entry)
    return acc
  }, {})

  const groupedVuItems = Object.entries(groupedVuEntries)
    .map(([itemId, entries]) => ({
      item: watchlist.find(w => w.id === itemId),
      entries,
    }))
    .filter(group => group.item)

  const currentItem = watchlist[watchIdx] || null
  const myWatchEntry = currentItem ? watched.find(w => w.item_id === currentItem.id && w.user_id === currentUser?.id) : null
  const anySeen = currentItem ? seenItemIds.includes(currentItem.id) : false
  const currentRoom = rooms.find(room => room.id === currentRoomId) || { id: 'marvel', name: 'Marvel' }
  const cinemaDays = mounted ? getCinemaDays() : []
  const availabilityBySlot = availability.reduce((acc, entry) => {
    const key = `${entry.day_key}|${entry.slot_key}`
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})
  const bestAvailability = Object.entries(availabilityBySlot)
    .map(([key, entries]) => {
      const [dayKey, slotKey] = key.split('|')
      const day = cinemaDays.find(d => d.key === dayKey)
      const slot = cinemaSlots.find(s => s.key === slotKey)
      return { key, day, slot, entries }
    })
    .filter(item => item.day && item.slot)
    .sort((a, b) => b.entries.length - a.entries.length || a.day.key.localeCompare(b.day.key))
    .slice(0, 3)
  const suggestedAvailabilityItem = watchlist.find(item => !seenItemIds.includes(item.id)) || watchlist[0] || null

  // ──────────────────────────────────────────────────────────
  if (!mounted) return (
    <>
      <Head>
        <title>CinéMarathon</title>
      </Head>
      <style>{globalCss}</style>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
    </>
  )

  if (!authed) return (
    <>
      <Head>
        <title>CinéMarathon</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{globalCss}</style>
      <div className="auth-screen">
        <div className="auth-box">
          <div className="auth-logo">
            <h1>CINÉMARATHON</h1>
            <p>Votre marathon Marvel</p>
          </div>
          <div className="auth-tabs">
            <button className={`auth-tab ${authTab === 'login' ? 'active' : ''}`} onClick={() => { setAuthTab('login'); setAuthError('') }}>Connexion</button>
            <button className={`auth-tab ${authTab === 'register' ? 'active' : ''}`} onClick={() => { setAuthTab('register'); setAuthError('') }}>Inscription</button>
          </div>
          {authTab === 'login' ? (
            <div>
              <div className="form-group"><label>Pseudo</label><input id="login-pseudo" type="text" placeholder="Votre pseudo" onKeyDown={e => e.key === 'Enter' && login()} /></div>
              <div className="form-group"><label>Mot de passe</label><input id="login-password" type="password" placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()} /></div>
              <button className="btn-primary" onClick={login} disabled={authLoading}>{authLoading ? 'Connexion…' : 'Entrer dans la salle'}</button>
            </div>
          ) : (
            <div>
              <div className="form-group"><label>Pseudo</label><input id="reg-pseudo" type="text" placeholder="Choisissez un pseudo" onKeyDown={e => e.key === 'Enter' && register()} /></div>
              <div className="form-group"><label>Mot de passe</label><input id="reg-password" type="password" placeholder="Au moins 4 caractères" onKeyDown={e => e.key === 'Enter' && register()} /></div>
              <div className="form-group"><label>Confirmer</label><input id="reg-confirm" type="password" placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && register()} /></div>
              <button className="btn-primary" onClick={register} disabled={authLoading}>{authLoading ? 'Création…' : 'Créer mon compte'}</button>
            </div>
          )}
          {authError && <div className="auth-error">{authError}</div>}
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>CinéMarathon</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{globalCss}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-logo">CINÉMARATHON</div>
        <div className="topbar-user">
          <div className="topbar-user-wrap">
            <button className={`user-menu-btn ${settingsOpen ? 'active' : ''}`} onClick={toggleSettings}>
              <div className="avatar">{currentUser?.pseudo?.[0]?.toUpperCase()}</div>
              <span className="user-name">{currentUser?.pseudo}</span>
              <span className="user-chevron">⌄</span>
            </button>
            {settingsOpen && (
              <div className="settings-menu">
                <div className="settings-title">Paramètres</div>
                <label className="settings-row">
                  <span>
                    <strong>Chat</strong>
                    <small>Bulle de discussion par room</small>
                  </span>
                  <input type="checkbox" checked={chatEnabled} onChange={e => setChatPreference(e.target.checked)} />
                </label>
              </div>
            )}
          </div>
          <button className="btn-logout" onClick={logout}>Quitter</button>
        </div>
      </div>

      {/* ROOMS */}
      <div className="room-bar">
        <div className="room-list">
          {(rooms.length ? rooms : [{ id: 'marvel', name: 'Marvel' }]).map(room => (
            <button key={room.id} className={`room-btn ${currentRoomId === room.id ? 'active' : ''}`} onClick={() => selectRoom(room.id)}>
              {room.name}
            </button>
          ))}
        </div>
        <div className="room-create">
          <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Nouvelle room" onKeyDown={e => e.key === 'Enter' && createNewRoom()} />
          <button onClick={createNewRoom}>Créer</button>
        </div>
        {roomMsg && <div className="room-msg">{roomMsg}</div>}
      </div>

      {/* NAV */}
      <nav className="nav">
        {[['liste', '🎬 Liste'], ['regarder', '▶ Regarder'], ['vu', '✓ Déjà vu'], ['dispos', '◷ Dispos'], ['secret', '◆ Secret'], ['admin', '⚙ Admin']].map(([id, label]) => (
          <button key={id} className={`nav-btn ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>{label}</button>
        ))}
      </nav>

      {/* ── LISTE ── */}
      {page === 'liste' && (
        <div className="page">
          <h1 className="page-title">Liste du marathon</h1>
          <p className="page-subtitle room-title">Room : {currentRoom.name}</p>
          <p className="page-subtitle">{watchlist.length > 0 ? `${seenItemIds.length} / ${watchlist.length} visionné${seenItemIds.length > 1 ? 's' : ''}` : "Ajoutez des titres depuis l'onglet Admin"}</p>
          <div className="stats-row">
            {[['Titres', watchlist.length], ['Vus', seenItemIds.length], ['Restants', watchlist.length - seenItemIds.length],
            ['Films', watchlist.filter(w => w.type === 'film').length], ['Séries', watchlist.filter(w => w.type === 'serie').length]
            ].map(([lbl, val]) => (
              <div key={lbl} className="stat-chip"><div className="val">{val}</div><div className="lbl">{lbl}</div></div>
            ))}
          </div>
          <div className="list-filters">
            {[['all', 'Tous'], ['film', 'Films'], ['serie', 'Séries'], ['unseen', 'Non vus'], ['seen', 'Vus']].map(([f, label]) => (
              <button key={f} className={`filter-btn ${listeFilter === f ? 'active' : ''}`} onClick={() => setListeFilter(f)}>{label}</button>
            ))}
          </div>
          {listeItems.length === 0
            ? <div className="empty-state"><div className="icon">🎬</div><p>Aucun titre à afficher.<br />Ajoutez-en dans l'onglet Admin !</p></div>
            : <div className="watchlist-grid">
              {listeItems.map(item => {
                const isSeen = seenItemIds.includes(item.id)
                const myR = watched.find(w => w.item_id === item.id && w.user_id === currentUser?.id)
                return (
                  <div key={item.id} className="wl-card" onClick={() => goWatch(item.id)}>
                    <div className="wl-card-num">{item.order}</div>
                    {isSeen && <div className="wl-card-seen">✓ Vu</div>}
                    {item.poster
                      ? <img className="wl-card-poster" src={item.poster} alt={item.title} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      : null}
                    <div className="wl-card-poster-placeholder" style={item.poster ? { display: 'none' } : {}}>
                      {item.type === 'film' ? '🎬' : '📺'}
                    </div>
                    <div className="wl-card-info">
                      <div className="wl-card-title">{item.title}{item.year ? <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: '11px' }}> ({item.year})</span> : null}</div>
                      <div className="wl-card-type">{item.type === 'film' ? 'Film' : 'Série'}{myR ? <span style={{ color: 'var(--gold)' }}> · ★ {myR.rating}/10</span> : null}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* ── REGARDER ── */}
      {page === 'regarder' && (
        <div className="page">
          <div className="watch-container">
            {watchlist.length === 0
              ? <div className="empty-state"><div className="icon">🎬</div><p>Aucun film ou série.<br />Ajoutez-en dans l'onglet Admin !</p></div>
              : <>
                {/* Progress */}
                <div className="watch-progress-bar-wrap">
                  <div className="watch-progress-label">
                    <span>Progression du marathon</span>
                    <span>{seenItemIds.length} / {watchlist.length}</span>
                  </div>
                  <div className="watch-progress-bar">
                    <div className="watch-progress-fill" style={{ width: watchlist.length > 0 ? `${(seenItemIds.length / watchlist.length * 100).toFixed(1)}%` : '0%' }} />
                  </div>
                </div>

                {/* CAROUSEL: [←] [POSTER] [→] */}
                <div className="carousel-row">
                  <button className="carousel-arrow" onClick={() => setWatchIdx(i => Math.max(0, i - 1))} disabled={watchIdx === 0}>‹</button>

                  <div className="watch-poster-wrap">
                    {currentItem?.poster
                      ? <img id="watch-poster" src={currentItem.poster} alt={currentItem.title}
                        onError={e => { e.target.style.display = 'none'; document.getElementById('watch-ph').style.display = 'flex' }} />
                      : null}
                    <div id="watch-ph" className="watch-poster-placeholder" style={currentItem?.poster ? { display: 'none' } : {}}>
                      {currentItem?.type === 'film' ? '🎬' : '📺'}
                    </div>
                    <div className="watch-poster-overlay">
                      <div className="watch-num">#{currentItem?.order} · {currentItem?.type === 'film' ? 'Film' : 'Série'}</div>
                      <div className="watch-title">{currentItem?.title}{currentItem?.year ? ` (${currentItem.year})` : ''}</div>
                    </div>
                    {anySeen && (
                      <div className="watch-seen-overlay">
                        <div className="watch-seen-badge">✓ Déjà vu</div>
                      </div>
                    )}
                  </div>

                  <button className="carousel-arrow" onClick={() => setWatchIdx(i => Math.min(watchlist.length - 1, i + 1))} disabled={watchIdx === watchlist.length - 1}>›</button>
                </div>

                {/* Counter */}
                <div className="watch-counter-row">
                  <span className="watch-counter">{watchIdx + 1} / {watchlist.length}</span>
                </div>

                {currentItem?.watch_url && (
                  <a className="watch-link" href={currentItem.watch_url} target="_blank" rel="noopener noreferrer">
                    Regarder{currentItem.platform ? ` sur ${currentItem.platform}` : ''}
                  </a>
                )}

                {/* RATING */}
                <div className="rating-section">
                  <div className="rating-label">Votre note</div>
                  <div className="stars-row">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(i => (
                      <span key={i}
                        className={`star ${i <= (hoverRating || currentRating) ? 'filled' : ''}`}
                        onClick={() => setCurrentRating(i)}
                        onMouseEnter={() => setHoverRating(i)}
                        onMouseLeave={() => setHoverRating(0)}
                      >★</span>
                    ))}
                  </div>
                  <div className="rating-value">{(hoverRating || currentRating) > 0 ? `${hoverRating || currentRating} / 10` : '— / 10'}</div>
                </div>

                {/* COMMENT */}
                <div className="comment-section">
                  <div className="comment-label">Note / Commentaire</div>
                  <textarea className="comment-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Vos impressions…" />
                </div>

                {/* ACTIONS */}
                <div className="watch-actions">
                  <button className="btn-mark" onClick={markWatched}
                    style={myWatchEntry ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}>
                    {myWatchEntry ? '✓ Modifier' : '✓ Marquer vu'}
                  </button>
                  <button className="btn-next" onClick={saveAndNext}>
                    {watchIdx === watchlist.length - 1 ? 'TERMINER ✓' : 'SUIVANT →'}
                  </button>
                </div>
                {myWatchEntry && (
                  <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: 'var(--text2)' }}>
                    Noté le {new Date(myWatchEntry.watched_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </>
            }
          </div>
        </div>
      )}

      {/* ── VU ── */}
      {page === 'vu' && (
        <div className="page">
          <h1 className="page-title">Déjà vus</h1>
          <p className="page-subtitle">Notes et impressions de tous les membres</p>

          <div className="vu-filter-row">
            <span className="vu-filter-label">Filtrer :</span>

            <button
              className={`filter-btn ${vuFilter === 'all' ? 'active' : ''}`}
              onClick={() => setVuFilter('all')}
            >
              Tout le monde
            </button>

            <button
              className={`filter-btn ${vuFilter === 'me' ? 'active' : ''}`}
              onClick={() => setVuFilter('me')}
            >
              Moi seulement
            </button>
          </div>

          {groupedVuItems.length === 0 ? (
            <div className="empty-state">
              <div className="icon">⭐</div>
              <p>Aucune note pour le moment.</p>
            </div>
          ) : (
            <div className="vu-list">
              {groupedVuItems.map(({ item, entries }) => (
                <div key={item.id} className="vu-card">
                  {item.poster ? (
                    <img
                      className="vu-poster"
                      src={item.poster}
                      alt={item.title}
                      onError={e => (e.target.style.display = 'none')}
                    />
                  ) : (
                    <div className="vu-poster-ph">
                      {item.type === 'film' ? '🎬' : '📺'}
                    </div>
                  )}

                  <div className="vu-info">
                    <div className="vu-top">
                      <div>
                        <div className="vu-title">
                          {item.title}
                          {item.year && (
                            <span style={{ fontSize: '14px', color: 'var(--text2)' }}>
                              {' '}({item.year})
                            </span>
                          )}
                        </div>

                        <div className="vu-type">
                          {item.type === 'film' ? 'Film' : 'Série'}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {entries.map(entry => {
                        const stars =
                          '★'.repeat(Math.round(entry.rating / 2)) +
                          '☆'.repeat(5 - Math.round(entry.rating / 2))

                        return (
                          <div key={entry.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                            <div className="vu-rating-display" style={{ display: 'inline-flex', marginBottom: '6px' }}>
                              <span className="vu-stars">{stars}</span>
                              <span className="vu-num">{entry.rating}/10</span>
                            </div>

                            <div className="vu-date">
                              Vu le {new Date(entry.watched_at).toLocaleDateString('fr-FR')}
                            </div>

                            {entry.comment && (
                              <div className="vu-comment">{entry.comment}</div>
                            )}

                            <div className="vu-user-tag">
                              Par <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                                {entry.pseudo}
                              </span>
                            </div>

                            {(entry.user_id === currentUser?.id || isAdmin) && (
                              <button
                                className="btn-del"
                                onClick={() => deleteReview(entry.id)}
                                style={{ marginTop: '8px' }}
                              >
                                Supprimer l'avis
                              </button>
                            )}

                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADMIN ── */}
      {page === 'dispos' && (
        <div className="page">
          <h1 className="page-title">Dispos cinéma</h1>
          <p className="page-subtitle">Trouvez le meilleur créneau pour lancer une séance dans la room {currentRoom.name}</p>

          <div className="availability-hero">
            <div>
              <div className="availability-kicker">Projecteur de groupe</div>
              <h2>{bestAvailability[0] ? `${bestAvailability[0].day.label} à ${bestAvailability[0].slot.label}` : 'Aucun créneau commun pour le moment'}</h2>
              <p>
                {bestAvailability[0]
                  ? `${bestAvailability[0].entries.length} membre${bestAvailability[0].entries.length > 1 ? 's' : ''} dispo pour une ${bestAvailability[0].slot.vibe.toLowerCase()}.`
                  : 'Cochez vos dispos pour faire apparaître le meilleur moment de visionnage.'}
              </p>
            </div>
            {suggestedAvailabilityItem && (
              <div className="availability-suggestion">
                <span>À lancer</span>
                <strong>{suggestedAvailabilityItem.title}</strong>
                <small>{suggestedAvailabilityItem.type === 'film' ? 'Film' : 'Série'}{suggestedAvailabilityItem.year ? ` · ${suggestedAvailabilityItem.year}` : ''}</small>
              </div>
            )}
          </div>

          <div className="availability-controls">
            <span>Mon envie du moment</span>
            {[
              ['any', 'Peu importe'],
              ['film', 'Film'],
              ['serie', 'Série'],
              ['short', 'Épisode court'],
            ].map(([value, label]) => (
              <button key={value} className={availabilityPreference === value ? 'active' : ''} onClick={() => setAvailabilityPreference(value)}>
                {label}
              </button>
            ))}
          </div>

          <div className="availability-grid">
            {cinemaDays.map(day => (
              <div key={day.key} className="availability-day">
                <div className="availability-day-title">{day.label}</div>
                {cinemaSlots.map(slot => {
                  const slotEntries = availabilityBySlot[`${day.key}|${slot.key}`] || []
                  const mine = slotEntries.some(entry => entry.user_id === currentUser?.id)
                  return (
                    <button key={slot.key} className={`availability-slot ${mine ? 'mine' : ''}`} onClick={() => toggleAvailability(day, slot)}>
                      <span>{slot.label}</span>
                      <small>{slot.vibe}</small>
                      <strong>{slotEntries.length}</strong>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="availability-board">
            <div className="availability-card">
              <h2>Meilleurs créneaux</h2>
              {bestAvailability.length === 0 ? (
                <p className="availability-empty">Pas encore assez de dispos pour calculer une séance.</p>
              ) : bestAvailability.map(item => (
                <div key={item.key} className="availability-rank">
                  <div>
                    <strong>{item.day.label} · {item.slot.label}</strong>
                    <span>{item.entries.map(entry => entry.pseudo).join(', ')}</span>
                  </div>
                  <b>{item.entries.length}</b>
                </div>
              ))}
            </div>
            <div className="availability-card">
              <h2>Casting dispo</h2>
              {availability.length === 0 ? (
                <p className="availability-empty">Personne n’a encore coché de créneau.</p>
              ) : [...new Set(availability.map(entry => entry.pseudo))].map(pseudo => {
                const count = availability.filter(entry => entry.pseudo === pseudo).length
                return (
                  <div key={pseudo} className="availability-person">
                    <span>{pseudo}</span>
                    <b>{count} créneau{count > 1 ? 'x' : ''}</b>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {page === 'secret' && (
        <div className="page">
          {!secretUnlocked ? (
            <div className="secret-lock">
              <div className="secret-lock-icon">◆</div>
              <h1>Zone secrète</h1>
              <p>Entre le mot de passe pour accéder au Watch Party.</p>
              <div className="secret-form">
                <input
                  type="password"
                  value={secretPassword}
                  onChange={e => setSecretPassword(e.target.value)}
                  placeholder="Mot de passe"
                  onKeyDown={e => e.key === 'Enter' && unlockSecret()}
                />
                <button onClick={unlockSecret}>Entrer</button>
              </div>
              {secretError && <div className="secret-error">{secretError}</div>}
            </div>
          ) : (
            <div className="watchparty-page">
              <div className="watchparty-hero">
                <div>
                  <div className="watchparty-kicker">Zone secrète</div>
                  <h1>Watch Party</h1>
                  <p>Prépare ici la future séance privée : partage d’écran, audio, statut de session et accès par code.</p>
                </div>
                <button className="watchparty-status">Session inactive</button>
              </div>

              <div className="watchparty-grid">
                <div className="watchparty-card">
                  <h2>Démarrer une session</h2>
                  <p>Le bouton final demandera l’autorisation du navigateur pour capturer ton écran et, si possible, l’audio.</p>
                  <button disabled>Démarrer bientôt</button>
                </div>
                <div className="watchparty-card">
                  <h2>Accès spectateurs</h2>
                  <p>Quand une session sera active, les autres verront ici l’état de la séance et pourront rejoindre avec le code secret.</p>
                  <div className="watchparty-code">azertypoppop</div>
                </div>
                <div className="watchparty-card wide">
                  <h2>Plan technique</h2>
                  <div className="watchparty-steps">
                    <span>1. Démarrer la session</span>
                    <span>2. Partager écran + audio</span>
                    <span>3. Les membres rejoignent</span>
                    <span>4. Fin de session quand tu coupes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {page === 'admin' && (
        <div className="page">
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Gérer la liste de la room {currentRoom.name}</p>
          <div className="admin-grid">
            <div className="admin-card">
              <h2>{editingId ? 'Modifier le titre' : 'Ajouter un titre'}</h2>
              <div className="admin-form-group"><label>Titre *</label><input className="admin-input" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Ex: Avengers: Endgame" onKeyDown={e => e.key === 'Enter' && (editingId ? saveEdit() : addItem())} /></div>
              <div className="admin-form-group">
                <label>Type *</label>
                <select className="admin-select" value={addType} onChange={e => setAddType(e.target.value)}>
                  <option value="film">🎬 Film</option>
                  <option value="serie">📺 Série</option>
                </select>
              </div>
              <div className="admin-form-group"><label>URL de l'affiche (optionnel)</label><input className="admin-input" value={addPoster} onChange={e => setAddPoster(e.target.value)} placeholder="https://image.tmdb.org/…" /></div>
              {addPoster && <img src={addPoster} style={{ width: '70px', aspectRatio: '2/3', borderRadius: '6px', objectFit: 'cover', marginBottom: '12px', border: '1px solid var(--border)' }} onError={e => e.target.style.display = 'none'} alt="preview" />}
              <div className="admin-form-group"><label>Année (optionnel)</label><input className="admin-input" value={addYear} onChange={e => setAddYear(e.target.value)} placeholder="2019" maxLength={4} /></div>
              <div className="admin-form-group"><label>Plateforme (optionnel)</label><input className="admin-input" value={addPlatform} onChange={e => setAddPlatform(e.target.value)} placeholder="Disney+" /></div>
              <div className="admin-form-group"><label>Lien de visionnage (optionnel)</label><input className="admin-input" value={addWatchUrl} onChange={e => setAddWatchUrl(e.target.value)} placeholder="https://www.disneyplus.com/..." /></div>
              <button className="btn-add" onClick={editingId ? saveEdit : addItem}>
                {editingId ? '✓ Enregistrer les modifications' : '+ Ajouter à la liste'}
              </button>

              {editingId && (
                <button className="btn-logout" onClick={cancelEdit} style={{ width: '100%', marginTop: '8px' }}>
                  Annuler
                </button>
              )}
              {addMsg && <div style={{ marginTop: '10px', fontSize: '13px', textAlign: 'center', color: addMsg.startsWith('ok:') ? 'var(--green)' : 'var(--red)' }}>{addMsg.slice(3)}</div>}
            </div>
            <div className="admin-card">
              <h2>Liste actuelle ({watchlist.length})</h2>
              {watchlist.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: '14px' }}>Aucun titre pour le moment</div>
                : <div className="admin-list">
                  {watchlist.map((item, idx) => (
                    <div key={item.id} className="admin-item">
                      <span className="admin-item-num">{item.order}</span>
                      {item.poster ? <img src={item.poster} style={{ width: '28px', aspectRatio: '2/3', borderRadius: '4px', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" /> : <span style={{ fontSize: '18px' }}>{item.type === 'film' ? '🎬' : '📺'}</span>}
                      <div className="admin-item-info">
                        <div className="admin-item-title">{item.title}{item.year ? ` (${item.year})` : ''}</div>
                        <div className="admin-item-type">{item.type === 'film' ? 'Film' : 'Série'}</div>
                      </div>
                      <button className="btn-up" onClick={() => startEdit(item)}>✎</button>
                      <button className="btn-up" onClick={() => moveItem(item.id, -1)} disabled={idx === 0}>▲</button>
                      <button className="btn-down" onClick={() => moveItem(item.id, 1)} disabled={idx === watchlist.length - 1}>▼</button>
                      <button className="btn-del" onClick={() => deleteItem(item.id)}>✕</button>
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        </div>
      )}

      {patchnotesOpen && (
        <div className="patch-modal">
          <div className="patch-box">
            <div className="patch-kicker">Patchnote</div>
            <h2>{patchnotes.title}</h2>
            <p>{patchnotes.intro}</p>
            <ul>
              {patchnotes.items.map(item => <li key={item}>{item}</li>)}
            </ul>
            <button onClick={closePatchnotes}>J’ai vu</button>
          </div>
        </div>
      )}

      {chatPromptVisible && (
        <div className="chat-consent">
          <div className="chat-consent-box">
            <h2>Nouveau : chat de room</h2>
            <p>Tu peux activer une bulle de discussion par room pour parler avec les autres membres pendant le marathon.</p>
            <div className="chat-consent-actions">
              <button className="chat-consent-primary" onClick={() => setChatPreference(true)}>Activer</button>
              <button className="chat-consent-secondary" onClick={() => setChatPreference(false)}>Pas maintenant</button>
            </div>
          </div>
        </div>
      )}

      <div className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        {chatOpen && (
          <div className="chat-panel">
            <div className="chat-head">
              <div>
                <div className="chat-title">Chat</div>
                <div className="chat-room">{currentRoom.name}</div>
              </div>
              <div className="chat-head-actions">
                <button onClick={() => setChatOpen(false)}>×</button>
              </div>
            </div>

            {chatEnabled ? (
              <>
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty">Aucun message dans cette room.</div>
                  ) : chatMessages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.user_id === currentUser?.id ? 'mine' : ''}`}>
                      <div className="chat-meta">
                        <span>{msg.pseudo || 'Membre'}</span>
                        <small>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                      <div className="chat-bubble-text">{msg.message}</div>
                    </div>
                  ))}
                </div>
                <div className={`chat-typing ${chatTypingUsers.length ? 'show' : ''}`}>
                  {chatTypingUsers.length ? `${chatTypingUsers[0].pseudo} écrit` : ''}
                  <span>.</span><span>.</span><span>.</span>
                </div>
                <div className="chat-compose">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Message..." maxLength={500} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} />
                  <button onClick={sendChatMessage}>Envoyer</button>
                </div>
              </>
            ) : (
              <div className="chat-disabled">
                <p>Le chat est désactivé pour ton compte sur cet appareil.</p>
                <button onClick={() => setChatPreference(true)}>Activer le chat</button>
              </div>
            )}
          </div>
        )}
        <button className="chat-bubble" onClick={() => setChatOpen(v => !v)}>
          {chatEnabled ? 'Chat' : 'Chat off'}
        </button>
      </div>

      <div className={`feedback-widget ${feedbackOpen ? 'open' : ''}`}>
        {feedbackOpen && (
          <div className="feedback-panel">
            <div className="feedback-head">
              <div>
                <div className="feedback-title">Retour</div>
                <div className="feedback-subtitle">Avis, bug ou idée d’ajout</div>
              </div>
              <button onClick={() => setFeedbackOpen(false)}>×</button>
            </div>
            <div className="feedback-body">
              <div className="feedback-types">
                {['Idée', 'Bug', 'Avis'].map(type => (
                  <button key={type} className={feedbackType === type ? 'active' : ''} onClick={() => setFeedbackType(type)}>
                    {type}
                  </button>
                ))}
              </div>
              <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} maxLength={1500} placeholder="Dis ce que tu penses du site, ce qu’il manque, ou ce qui bug..." />
              <div className="feedback-foot">
                <span>{feedbackMessage.length}/1500</span>
                <button onClick={sendFeedback} disabled={feedbackLoading}>{feedbackLoading ? 'Envoi...' : 'Envoyer'}</button>
              </div>
            </div>
          </div>
        )}
        <button className="feedback-bubble" onClick={() => setFeedbackOpen(v => !v)}>
          Retour
        </button>
      </div>

      {/* TOAST */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </>
  )
}

// ─── CSS ───────────────────────────────────────────────────
const globalCss = `
          :root {
            --gold: #C9A84C; --gold-light: #E8C87A; --gold-dark: #8B6914;
          --bg: #0A0A0A; --bg2: #111111; --bg3: #1A1A1A; --bg4: #222222;
          --border: rgba(201,168,76,0.2); --text: #F0EAD6; --text2: #9B9080;
          --red: #E05252; --green: #52C47A; --radius: 12px;
  }
          * {margin:0; padding:0; box-sizing:border-box; }
          html, body {background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden; }
          input, select, textarea, button {font-family:'DM Sans',sans-serif; }

          /* AUTH */
          .auth-screen {min-height:100vh; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%); }
          .auth-box {background:var(--bg2); border:1px solid var(--border); border-radius:20px; padding:48px 40px; width:420px; max-width:95vw; }
          .auth-logo {text-align:center; margin-bottom:32px; }
          .auth-logo h1 {font-family:'Playfair Display',serif; font-size:36px; font-weight:900; background:linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:2px; }
          .auth-logo p {color:var(--text2); font-size:13px; margin-top:4px; letter-spacing:3px; text-transform:uppercase; }
          .auth-tabs {display:flex; background:var(--bg3); border-radius:10px; padding:4px; margin-bottom:24px; }
          .auth-tab {flex:1; padding:10px; text-align:center; border-radius:8px; cursor:pointer; font-size:14px; font-weight:500; transition:all 0.2s; color:var(--text2); border:none; background:none; }
          .auth-tab.active {background:var(--gold); color:#000; font-weight:600; }
          .form-group {margin-bottom:16px; }
          .form-group label {display:block; font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
          .form-group input {width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 16px; color:var(--text); font-size:15px; outline:none; transition:border-color 0.2s; }
          .form-group input:focus {border-color:var(--gold); }
          .btn-primary {width:100%; padding:14px; background:var(--gold); color:#000; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; letter-spacing:1px; text-transform:uppercase; transition:all 0.2s; margin-top:8px; }
          .btn-primary:hover:not(:disabled) {background:var(--gold-light); }
          .btn-primary:disabled {opacity:0.6; cursor:not-allowed; }
          .auth-error {color:var(--red); font-size:13px; text-align:center; margin-top:12px; }

          /* APP */
          .topbar {display:flex; align-items:center; justify-content:space-between; padding:16px 32px; border-bottom:1px solid var(--border); background:rgba(10,10,10,0.95); backdrop-filter:blur(10px); position:sticky; top:0; z-index:100; }
          .topbar-logo {font-family:'Playfair Display',serif; font-size:22px; font-weight:900; background:linear-gradient(135deg,var(--gold-light),var(--gold)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:2px; }
          .topbar-user {display:flex; align-items:center; gap:12px; }
          .topbar-user-wrap {position:relative; }
          .user-menu-btn {display:flex; align-items:center; gap:10px; background:transparent; border:1px solid transparent; color:var(--text); border-radius:12px; padding:4px 8px 4px 4px; cursor:pointer; transition:all 0.2s; }
          .user-menu-btn:hover, .user-menu-btn.active {background:var(--bg2); border-color:var(--border); }
          .avatar {width:36px; height:36px; border-radius:50%; background:var(--gold); color:#000; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; }
          .user-name {font-size:14px; font-weight:500; }
          .user-chevron {color:var(--text2); font-size:16px; line-height:1; transform:translateY(-1px); transition:transform 0.2s; }
          .user-menu-btn.active .user-chevron {transform:rotate(180deg) translateY(1px); }
          .settings-menu {position:absolute; right:0; top:calc(100% + 10px); width:260px; background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 18px 55px rgba(0,0,0,0.6); z-index:200; }
          .settings-title {font-family:'Playfair Display',serif; color:var(--gold); font-size:18px; font-weight:800; margin-bottom:10px; }
          .settings-row {display:flex; align-items:center; justify-content:space-between; gap:14px; padding:10px; background:var(--bg3); border:1px solid var(--border); border-radius:10px; cursor:pointer; }
          .settings-row span {display:flex; flex-direction:column; gap:2px; }
          .settings-row strong {font-size:13px; color:var(--text); }
          .settings-row small {font-size:11px; color:var(--text2); line-height:1.25; }
          .settings-row input {width:18px; height:18px; accent-color:var(--gold); flex-shrink:0; }
          .btn-logout {background:none; border:1px solid var(--border); color:var(--text2); padding:6px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:all 0.2s; }
          .btn-logout:hover {border-color:var(--red); color:var(--red); }

          .room-bar {display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 32px; border-bottom:1px solid var(--border); background:var(--bg); flex-wrap:wrap; }
          .room-list {display:flex; gap:8px; flex-wrap:wrap; }
          .room-btn {padding:8px 14px; border:1px solid var(--border); background:var(--bg2); color:var(--text2); border-radius:8px; font-size:13px; cursor:pointer; transition:all 0.2s; }
          .room-btn.active, .room-btn:hover {background:var(--gold); border-color:var(--gold); color:#000; font-weight:700; }
          .room-create {display:flex; gap:8px; align-items:center; }
          .room-create input {width:160px; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:8px 10px; font-size:13px; outline:none; }
          .room-create button {background:var(--bg2); border:1px solid var(--gold); color:var(--gold); border-radius:8px; padding:8px 12px; font-size:13px; font-weight:700; cursor:pointer; }
          .room-msg {width:100%; color:var(--red); font-size:12px; }
          .room-title {margin-bottom:8px; color:var(--gold); }

          .nav {display:flex; padding:0 32px; border-bottom:1px solid var(--border); background:var(--bg2); }
          .nav-btn {padding:16px 24px; background:none; border:none; border-bottom:2px solid transparent; color:var(--text2); font-size:12px; font-weight:500; cursor:pointer; letter-spacing:2px; transition:all 0.2s; text-transform:uppercase; }
          .nav-btn.active {color:var(--gold); border-bottom-color:var(--gold); }
          .nav-btn:hover:not(.active) {color:var(--text); }

          .page {padding:32px; max-width:1100px; margin:0 auto; }
          .page-title {font-family:'Playfair Display',serif; font-size:32px; font-weight:700; margin-bottom:8px; }
          .page-subtitle {color:var(--text2); font-size:14px; margin-bottom:28px; }

          /* STATS */
          .stats-row {display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
          .stat-chip {background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:10px 16px; text-align:center; }
          .stat-chip .val {font-family:'Playfair Display',serif; font-size:24px; font-weight:700; color:var(--gold); }
          .stat-chip .lbl {font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }

          /* LISTE */
          .list-filters {display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
          .filter-btn {padding:8px 18px; border:1px solid var(--border); background:none; color:var(--text2); border-radius:20px; font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer; transition:all 0.2s; }
          .filter-btn.active, .filter-btn:hover {background:var(--gold); color:#000; border-color:var(--gold); font-weight:600; }
          .watchlist-grid {display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:16px; }
          .wl-card {background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; transition:transform 0.2s,border-color 0.2s; cursor:pointer; position:relative; }
          .wl-card:hover {transform:translateY(-4px); border-color:var(--gold); }
          .wl-card-poster {width:100%; aspect-ratio:2/3; object-fit:cover; display:block; }
          .wl-card-poster-placeholder {width:100%; aspect-ratio:2/3; background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:36px; }
          .wl-card-info {padding:10px; }
          .wl-card-title {font-size:13px; font-weight:600; line-height:1.3; margin-bottom:3px; }
          .wl-card-type {font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:1px; }
          .wl-card-num {position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.85); color:var(--gold); font-size:11px; font-weight:700; padding:3px 7px; border-radius:5px; font-family:'Playfair Display',serif; }
          .wl-card-seen {position:absolute; top:8px; right:8px; background:rgba(82,196,122,0.9); color:#000; font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; }

          /* REGARDER */
          .watch-container {max-width:460px; margin:0 auto; }
          .watch-progress-bar-wrap {margin-bottom:20px; }
          .watch-progress-label {display:flex; justify-content:space-between; font-size:12px; color:var(--text2); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; }
          .watch-progress-bar {height:3px; background:var(--bg3); border-radius:2px; overflow:hidden; }
          .watch-progress-fill {height:100%; background:linear-gradient(90deg,var(--gold-dark),var(--gold)); transition:width 0.5s ease; }

          /* CAROUSEL */
          .carousel-row {display:flex; align-items:center; gap:0; margin-bottom:12px; }
          .carousel-arrow {background:none; border:none; color:var(--gold); font-size:64px; cursor:pointer; padding:0 8px; line-height:1; transition:all 0.15s; user-select:none; flex-shrink:0; height:100%; display:flex; align-items:center; }
          .carousel-arrow:hover:not(:disabled) {color:var(--gold-light); transform:scale(1.1); }
          .carousel-arrow:disabled {color:var(--bg4); cursor:default; }

          .watch-poster-wrap {position:relative; border-radius:16px; overflow:hidden; flex:1; box-shadow:0 20px 60px rgba(0,0,0,0.8); aspect-ratio:2/3; max-height:380px; background:var(--bg3); }
          .watch-poster-wrap img {width:100%; height:100%; object-fit:cover; display:block; }
          .watch-poster-placeholder {width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:64px; background:var(--bg3); }
          .watch-poster-overlay {position:absolute; bottom:0; left:0; right:0; padding:40px 16px 16px; background:linear-gradient(to top,rgba(0,0,0,0.9),transparent); }
          .watch-num {font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:2px; }
          .watch-title {font-family:'Playfair Display',serif; font-size:20px; font-weight:700; line-height:1.2; margin-top:4px; }
          .watch-seen-overlay {position:absolute; inset:0; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; }
          .watch-seen-badge {background:var(--green); color:#000; font-weight:700; font-size:16px; padding:10px 24px; border-radius:30px; }

          .watch-counter-row {text-align:center; margin-bottom:16px; }
          .watch-counter {font-size:13px; color:var(--text2); }
          .watch-link {display:block; width:100%; text-align:center; margin-bottom:12px; padding:12px 14px; background:var(--gold); color:#000; border-radius:10px; text-decoration:none; font-size:14px; font-weight:800; letter-spacing:1px; text-transform:uppercase; transition:all 0.2s; }
          .watch-link:hover {background:var(--gold-light); transform:translateY(-1px); }

          .rating-section {background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; margin-bottom:12px; }
          .rating-label {font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
          .stars-row {display:flex; gap:2px; justify-content:center; margin-bottom:6px; }
          .star {font-size:26px; cursor:pointer; transition:transform 0.1s,color 0.1s; color:#333; line-height:1; user-select:none; }
          .star.filled {color:var(--gold); }
          .star:hover {transform:scale(1.15); }
          .rating-value {text-align:center; font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--gold); min-height:22px; }

          .comment-section {background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; margin-bottom:12px; }
          .comment-label {font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
          .comment-textarea {width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px; color:var(--text); font-size:14px; resize:vertical; min-height:80px; outline:none; transition:border-color 0.2s; line-height:1.5; }
          .comment-textarea:focus {border-color:var(--gold); }

          .watch-actions {display:flex; gap:10px; }
          .btn-mark {flex:1; padding:13px; background:none; border:1px solid var(--green); color:var(--green); border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; }
          .btn-mark:hover {background:var(--green); color:#000; }
          .btn-next {flex:2; padding:13px; background:var(--gold); color:#000; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; letter-spacing:2px; text-transform:uppercase; transition:all 0.2s; }
          .btn-next:hover {background:var(--gold-light); transform:translateY(-1px); }

          /* VU */
          .vu-filter-row {display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }
          .vu-filter-label {font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; }
          .vu-list {display:flex; flex-direction:column; gap:14px; }
          .vu-card {background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; display:flex; gap:14px; align-items:flex-start; }
          .vu-poster {width:65px; min-width:65px; aspect-ratio:2/3; border-radius:8px; object-fit:cover; }
          .vu-poster-ph {width:65px; min-width:65px; aspect-ratio:2/3; border-radius:8px; background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:22px; }
          .vu-info {flex:1; min-width:0; }
          .vu-top {display:flex; align-items:flex-start; justify-content:space-between; gap:8px; flex-wrap:wrap; }
          .vu-title {font-family:'Playfair Display',serif; font-size:17px; font-weight:700; }
          .vu-type {font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
          .vu-rating-display {display:flex; align-items:center; gap:6px; background:var(--bg3); padding:5px 10px; border-radius:20px; border:1px solid var(--border); white-space:nowrap; }
          .vu-stars {color:var(--gold); font-size:12px; letter-spacing:-1px; }
          .vu-num {font-family:'Playfair Display',serif; font-weight:700; font-size:14px; color:var(--gold); }
          .vu-date {font-size:12px; color:var(--text2); margin-top:4px; }
          .vu-comment {margin-top:8px; font-size:13px; color:var(--text2); line-height:1.5; font-style:italic; border-left:2px solid var(--border); padding-left:10px; }

          /* DISPOS */
          .availability-hero {display:flex; justify-content:space-between; gap:20px; align-items:stretch; background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:24px; margin-bottom:18px; }
          .availability-kicker {font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; }
          .availability-hero h2 {font-family:'Playfair Display',serif; font-size:28px; color:var(--text); margin-bottom:8px; }
          .availability-hero p {color:var(--text2); font-size:14px; line-height:1.5; }
          .availability-suggestion {min-width:210px; background:var(--bg3); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:center; gap:5px; }
          .availability-suggestion span {font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; }
          .availability-suggestion strong {font-family:'Playfair Display',serif; color:var(--gold); font-size:20px; line-height:1.15; }
          .availability-suggestion small {color:var(--text2); font-size:12px; }
          .availability-controls {display:flex; align-items:center; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
          .availability-controls span {font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-right:4px; }
          .availability-controls button {border:1px solid var(--border); background:transparent; color:var(--text2); border-radius:999px; padding:8px 14px; font-size:13px; cursor:pointer; }
          .availability-controls button.active, .availability-controls button:hover {background:var(--gold); border-color:var(--gold); color:#000; font-weight:700; }
          .availability-grid {display:grid; grid-template-columns:repeat(7,minmax(110px,1fr)); gap:10px; margin-bottom:22px; }
          .availability-day {background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:10px; }
          .availability-day-title {color:var(--gold); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:9px; text-align:center; }
          .availability-slot {width:100%; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:10px 8px; margin-bottom:8px; cursor:pointer; display:grid; grid-template-columns:1fr auto; gap:2px 8px; text-align:left; transition:all 0.2s; }
          .availability-slot:last-child {margin-bottom:0; }
          .availability-slot span {font-weight:800; font-size:14px; }
          .availability-slot small {grid-column:1; color:var(--text2); font-size:11px; }
          .availability-slot strong {grid-column:2; grid-row:1 / span 2; align-self:center; justify-self:end; width:24px; height:24px; border-radius:50%; background:var(--bg2); color:var(--gold); display:flex; align-items:center; justify-content:center; font-size:12px; }
          .availability-slot.mine {background:rgba(201,168,76,0.18); border-color:var(--gold); }
          .availability-slot.mine strong {background:var(--gold); color:#000; }
          .availability-board {display:grid; grid-template-columns:1fr 1fr; gap:18px; }
          .availability-card {background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:20px; }
          .availability-card h2 {font-family:'Playfair Display',serif; color:var(--gold); font-size:22px; margin-bottom:14px; }
          .availability-empty {color:var(--text2); font-size:14px; line-height:1.5; }
          .availability-rank, .availability-person {display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 0; border-top:1px solid var(--border); }
          .availability-rank:first-of-type, .availability-person:first-of-type {border-top:none; padding-top:0; }
          .availability-rank div {display:flex; flex-direction:column; gap:4px; min-width:0; }
          .availability-rank strong, .availability-person span {color:var(--text); font-size:14px; }
          .availability-rank span {color:var(--text2); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .availability-rank b, .availability-person b {background:var(--gold); color:#000; border-radius:999px; padding:5px 9px; font-size:12px; white-space:nowrap; }

          /* SECRET / WATCH PARTY */
          .secret-lock {max-width:430px; margin:70px auto 0; background:var(--bg2); border:1px solid var(--border); border-radius:18px; padding:34px; text-align:center; box-shadow:0 24px 80px rgba(0,0,0,0.55); }
          .secret-lock-icon {width:52px; height:52px; border-radius:50%; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; background:var(--gold); color:#000; font-size:20px; }
          .secret-lock h1 {font-family:'Playfair Display',serif; color:var(--gold); font-size:32px; margin-bottom:8px; }
          .secret-lock p {color:var(--text2); font-size:14px; line-height:1.5; margin-bottom:20px; }
          .secret-form {display:flex; gap:10px; }
          .secret-form input {flex:1; min-width:0; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); outline:none; font-size:14px; }
          .secret-form input:focus {border-color:var(--gold); }
          .secret-form button {background:var(--gold); border:none; color:#000; border-radius:10px; padding:0 18px; font-size:13px; font-weight:900; cursor:pointer; }
          .secret-error {margin-top:12px; color:var(--red); font-size:13px; }
          .watchparty-page {display:flex; flex-direction:column; gap:22px; }
          .watchparty-hero {display:flex; justify-content:space-between; align-items:center; gap:18px; background:linear-gradient(135deg,rgba(201,168,76,0.16),rgba(17,17,17,1)); border:1px solid var(--border); border-radius:18px; padding:28px; }
          .watchparty-kicker {font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; }
          .watchparty-hero h1 {font-family:'Playfair Display',serif; font-size:38px; color:var(--gold); margin-bottom:8px; }
          .watchparty-hero p {color:var(--text2); max-width:620px; font-size:14px; line-height:1.55; }
          .watchparty-status {background:transparent; border:1px solid var(--border); color:var(--text2); border-radius:999px; padding:10px 16px; font-size:13px; font-weight:800; white-space:nowrap; }
          .watchparty-grid {display:grid; grid-template-columns:1fr 1fr; gap:18px; }
          .watchparty-card {background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:22px; }
          .watchparty-card.wide {grid-column:1 / -1; }
          .watchparty-card h2 {font-family:'Playfair Display',serif; color:var(--gold); font-size:22px; margin-bottom:10px; }
          .watchparty-card p {color:var(--text2); font-size:14px; line-height:1.5; margin-bottom:16px; }
          .watchparty-card button {background:var(--bg3); border:1px solid var(--border); color:var(--text2); border-radius:10px; padding:12px 14px; font-weight:800; cursor:not-allowed; }
          .watchparty-code {display:inline-flex; background:var(--bg3); border:1px solid var(--gold); color:var(--gold); border-radius:10px; padding:10px 14px; font-size:14px; font-weight:900; letter-spacing:1px; }
          .watchparty-steps {display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
          .watchparty-steps span {background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px; color:var(--text); font-size:13px; text-align:center; }

          /* ADMIN */
          .admin-grid {display:grid; grid-template-columns:1fr 1fr; gap:24px; }
          .admin-card {background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:28px; }
          .admin-card h2 {font-family:'Playfair Display',serif; font-size:22px; font-weight:700; margin-bottom:20px; color:var(--gold); }
          .admin-form-group {margin-bottom:14px; }
          .admin-form-group label {display:block; font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
          .admin-input {width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:8px; padding:10px 14px; color:var(--text); font-size:14px; outline:none; transition:border-color 0.2s; }
          .admin-input:focus {border-color:var(--gold); }
          .admin-select {width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:8px; padding:10px 14px; color:var(--text); font-size:14px; outline:none; cursor:pointer; appearance:none; }
          .btn-add {width:100%; padding:12px; background:var(--gold); color:#000; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; text-transform:uppercase; letter-spacing:1px; transition:all 0.2s; margin-top:6px; }
          .btn-add:hover {background:var(--gold-light); }
          .admin-list {display:flex; flex-direction:column; gap:8px; max-height:420px; overflow-y:auto; }
          .admin-item {display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg3); border-radius:8px; border:1px solid var(--border); }
          .admin-item-num {font-size:11px; color:var(--gold); font-weight:700; min-width:20px; font-family:'Playfair Display',serif; }
          .admin-item-info {flex:1; min-width:0; }
          .admin-item-title {font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .admin-item-type {font-size:11px; color:var(--text2); text-transform:uppercase; }
          .btn-del {background:none; border:none; color:var(--text2); cursor:pointer; font-size:14px; padding:4px; transition:color 0.2s; }
          .btn-del:hover {color:var(--red); }
          .btn-up, .btn-down {background:none; border:none; color:var(--text2); cursor:pointer; font-size:12px; padding:4px; transition:color 0.2s; }
          .btn-up:hover, .btn-down:hover {color:var(--gold); }
          .btn-up:disabled, .btn-down:disabled {opacity:0.2; cursor:default; }

          /* CHAT */
          .chat-widget {position:fixed; right:22px; bottom:22px; z-index:9000; display:flex; flex-direction:column; align-items:flex-end; gap:12px; }
          .chat-bubble {min-width:78px; height:48px; border-radius:24px; border:1px solid var(--gold); background:var(--gold); color:#000; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 12px 35px rgba(0,0,0,0.45); padding:0 18px; }
          .chat-widget.open .chat-bubble {background:var(--bg2); color:var(--gold); }
          .chat-panel {width:340px; max-width:calc(100vw - 32px); height:430px; max-height:calc(100vh - 120px); background:var(--bg2); border:1px solid var(--border); border-radius:14px; overflow:hidden; box-shadow:0 22px 70px rgba(0,0,0,0.65); display:flex; flex-direction:column; }
          .chat-head {display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:14px 14px 12px; border-bottom:1px solid var(--border); background:var(--bg3); }
          .chat-title {font-family:'Playfair Display',serif; font-size:18px; font-weight:800; color:var(--gold); }
          .chat-room {font-size:12px; color:var(--text2); margin-top:2px; }
          .chat-head-actions {display:flex; align-items:center; gap:8px; }
          .chat-head-actions button {width:28px; height:28px; border-radius:7px; border:1px solid var(--border); background:transparent; color:var(--text2); cursor:pointer; font-size:20px; line-height:1; }
          .chat-messages {flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; }
          .chat-empty {margin:auto; color:var(--text2); font-size:13px; text-align:center; }
          .chat-message {max-width:88%; align-self:flex-start; }
          .chat-message.mine {align-self:flex-end; }
          .chat-meta {display:flex; align-items:center; gap:7px; margin-bottom:4px; font-size:11px; color:var(--text2); }
          .chat-message.mine .chat-meta {justify-content:flex-end; }
          .chat-meta span {color:var(--gold); font-weight:700; }
          .chat-meta small {font-size:10px; color:var(--text2); }
          .chat-bubble-text {background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:12px; border-bottom-left-radius:4px; padding:9px 11px; font-size:13px; line-height:1.4; word-break:break-word; }
          .chat-message.mine .chat-bubble-text {background:var(--gold); color:#000; border-color:var(--gold); border-bottom-left-radius:12px; border-bottom-right-radius:4px; }
          .chat-typing {height:22px; padding:0 14px; color:var(--text2); font-size:12px; opacity:0; transition:opacity 0.2s; }
          .chat-typing.show {opacity:1; }
          .chat-typing span {animation:chatDots 1s infinite; }
          .chat-typing span:nth-child(2) {animation-delay:0.15s; }
          .chat-typing span:nth-child(3) {animation-delay:0.3s; }
          @keyframes chatDots {0%, 60%, 100% {opacity:0.25;} 30% {opacity:1;}}
          .chat-compose {display:flex; gap:8px; padding:12px; border-top:1px solid var(--border); background:var(--bg3); }
          .chat-compose input {flex:1; min-width:0; background:var(--bg2); border:1px solid var(--border); color:var(--text); border-radius:9px; padding:10px 11px; font-size:13px; outline:none; }
          .chat-compose input:focus {border-color:var(--gold); }
          .chat-compose button, .chat-disabled button {background:var(--gold); border:none; color:#000; border-radius:9px; padding:10px 12px; font-size:12px; font-weight:800; cursor:pointer; }
          .chat-disabled {height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:28px; color:var(--text2); text-align:center; font-size:13px; }
          .chat-consent {position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,0.68); display:flex; align-items:center; justify-content:center; padding:18px; }
          .chat-consent-box {width:390px; max-width:100%; background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:26px; box-shadow:0 24px 80px rgba(0,0,0,0.7); }
          .chat-consent-box h2 {font-family:'Playfair Display',serif; color:var(--gold); font-size:24px; margin-bottom:10px; }
          .chat-consent-box p {color:var(--text2); font-size:14px; line-height:1.55; margin-bottom:20px; }
          .chat-consent-actions {display:flex; gap:10px; }
          .chat-consent-actions button {flex:1; padding:12px; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer; }
          .chat-consent-primary {background:var(--gold); border:1px solid var(--gold); color:#000; }
          .chat-consent-secondary {background:transparent; border:1px solid var(--border); color:var(--text2); }

          /* PATCHNOTES */
          .patch-modal {position:fixed; inset:0; z-index:9400; background:rgba(0,0,0,0.68); display:flex; align-items:center; justify-content:center; padding:18px; }
          .patch-box {width:480px; max-width:100%; background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:28px; box-shadow:0 24px 80px rgba(0,0,0,0.7); }
          .patch-kicker {display:inline-flex; color:#000; background:var(--gold); border-radius:999px; padding:5px 10px; font-size:11px; font-weight:900; letter-spacing:1px; text-transform:uppercase; margin-bottom:14px; }
          .patch-box h2 {font-family:'Playfair Display',serif; color:var(--gold); font-size:28px; margin-bottom:10px; }
          .patch-box p {color:var(--text2); font-size:14px; line-height:1.55; margin-bottom:16px; }
          .patch-box ul {display:flex; flex-direction:column; gap:9px; margin:0 0 22px 18px; color:var(--text); font-size:14px; line-height:1.45; }
          .patch-box li::marker {color:var(--gold); }
          .patch-box button {width:100%; background:var(--gold); border:1px solid var(--gold); color:#000; border-radius:10px; padding:12px; font-size:13px; font-weight:900; cursor:pointer; }

          /* FEEDBACK */
          .feedback-widget {position:fixed; left:22px; bottom:22px; z-index:8900; display:flex; flex-direction:column; align-items:flex-start; gap:12px; }
          .feedback-bubble {min-width:86px; height:46px; border-radius:23px; border:1px solid var(--border); background:var(--bg2); color:var(--gold); font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 12px 35px rgba(0,0,0,0.45); padding:0 18px; }
          .feedback-widget.open .feedback-bubble {background:var(--gold); color:#000; border-color:var(--gold); }
          .feedback-panel {width:330px; max-width:calc(100vw - 32px); background:var(--bg2); border:1px solid var(--border); border-radius:14px; overflow:hidden; box-shadow:0 22px 70px rgba(0,0,0,0.65); }
          .feedback-head {display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:14px; border-bottom:1px solid var(--border); background:var(--bg3); }
          .feedback-title {font-family:'Playfair Display',serif; font-size:18px; font-weight:800; color:var(--gold); }
          .feedback-subtitle {font-size:12px; color:var(--text2); margin-top:2px; }
          .feedback-head button {width:28px; height:28px; border-radius:7px; border:1px solid var(--border); background:transparent; color:var(--text2); cursor:pointer; font-size:20px; line-height:1; }
          .feedback-body {padding:14px; }
          .feedback-types {display:flex; gap:8px; margin-bottom:12px; }
          .feedback-types button {flex:1; border:1px solid var(--border); background:transparent; color:var(--text2); border-radius:8px; padding:8px; font-size:12px; font-weight:700; cursor:pointer; }
          .feedback-types button.active, .feedback-types button:hover {background:var(--gold); color:#000; border-color:var(--gold); }
          .feedback-body textarea {width:100%; min-height:118px; resize:vertical; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:11px; font-size:13px; line-height:1.45; outline:none; }
          .feedback-body textarea:focus {border-color:var(--gold); }
          .feedback-foot {display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; }
          .feedback-foot span {font-size:11px; color:var(--text2); }
          .feedback-foot button {background:var(--gold); border:none; color:#000; border-radius:9px; padding:10px 12px; font-size:12px; font-weight:800; cursor:pointer; }
          .feedback-foot button:disabled {opacity:0.6; cursor:not-allowed; }

          /* TOAST */
          .toast {position:fixed; bottom:30px; left:50%; transform:translateX(-50%) translateY(100px); background:var(--bg3); border:1px solid var(--gold); color:var(--text); padding:12px 24px; border-radius:30px; font-size:14px; font-weight:500; z-index:10000; transition:transform 0.3s ease; white-space:nowrap; pointer-events:none; }
          .toast.show {transform:translateX(-50%) translateY(0); }

          .empty-state {text-align:center; padding:60px 20px; color:var(--text2); }
          .empty-state .icon {font-size:48px; margin-bottom:16px; }
          .empty-state p {font-size:15px; line-height:1.6; }

          ::-webkit-scrollbar {width:5px; } ::-webkit-scrollbar-track {background:var(--bg2); } ::-webkit-scrollbar-thumb {background:var(--bg4); border-radius:3px; }

          @media(max-width:700px) {
    .admin-grid {grid-template-columns:1fr; }
          .topbar {padding:12px 16px; }
          .topbar-user {gap:8px; }
          .settings-menu {right:0; width:240px; }
          .user-name {display:none; }
          .room-bar {padding:12px 16px; align-items:stretch; }
          .room-create {width:100%; }
          .room-create input {flex:1; width:auto; }
          .chat-widget {right:14px; bottom:14px; }
          .chat-panel {width:calc(100vw - 28px); height:410px; }
          .chat-consent-actions {flex-direction:column; }
          .feedback-widget {left:14px; bottom:14px; }
          .feedback-panel {width:calc(100vw - 28px); }
          .availability-hero {flex-direction:column; padding:18px; }
          .availability-grid {grid-template-columns:1fr; }
          .availability-board {grid-template-columns:1fr; }
          .secret-form {flex-direction:column; }
          .secret-form button {padding:12px; }
          .watchparty-hero {flex-direction:column; align-items:flex-start; }
          .watchparty-grid {grid-template-columns:1fr; }
          .watchparty-steps {grid-template-columns:1fr; }
          .nav {padding:0 8px; }
          .nav-btn {padding:14px 10px; font-size:10px; letter-spacing:1px; }
          .page {padding:20px 16px; }
          .watch-container {max-width:100%; }
          .carousel-arrow {font-size:44px; padding:0 4px; }
  }
          `

import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('cm_token') : null
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('cm_user'))
  } catch {
    return null
  }
}

function saveSession(token, user) {
  localStorage.setItem('cm_token', token)
  localStorage.setItem('cm_user', JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem('cm_token')
  localStorage.removeItem('cm_user')
}

async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Erreur API')
  }

  return data
}

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authTab, setAuthTab] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [page, setPage] = useState('liste')
  const [watchlist, setWatchlist] = useState([])
  const [watched, setWatched] = useState([])

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
  const [addMsg, setAddMsg] = useState('')

  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    const user = getUser()
    const token = getToken()

    if (user && token) {
      setCurrentUser(user)
      setAuthed(true)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!authed) return

    try {
      const [wl, wd] = await Promise.all([
        api('GET', '/auth/watchlist'),
        api('GET', '/auth/watchlist/watched'),
      ])

      setWatchlist(wl)
      setWatched(wd)
    } catch (err) {
      console.error(err)
    }
  }, [authed])

  useEffect(() => {
    if (authed) loadData()
  }, [authed, loadData])

  useEffect(() => {
    if (authed) loadData()
  }, [page])

  useEffect(() => {
    if (!watchlist.length) return

    const item = watchlist[watchIdx]
    if (!item) return

    const myEntry = watched.find(
      w => w.item_id === item.id && w.user_id === currentUser?.id
    )

    setCurrentRating(myEntry ? myEntry.rating : 0)
    setComment(myEntry ? myEntry.comment || '' : '')
  }, [watchIdx, watchlist, watched, currentUser])

  function showToast(msg) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2200)
  }

  async function login() {
    const pseudo = document.getElementById('login-pseudo').value.trim()
    const password = document.getElementById('login-password').value

    if (!pseudo || !password) {
      setAuthError('Remplissez tous les champs.')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setAuthError(json.error || 'Erreur de connexion')
        setAuthLoading(false)
        return
      }

      saveSession(json.token, json.user)
      setCurrentUser(json.user)
      setAuthed(true)
    } catch {
      setAuthError('Erreur de connexion')
    }

    setAuthLoading(false)
  }

  async function register() {
    const pseudo = document.getElementById('reg-pseudo').value.trim()
    const password = document.getElementById('reg-password').value
    const confirm = document.getElementById('reg-confirm').value

    if (!pseudo || !password) {
      setAuthError('Remplissez tous les champs.')
      return
    }

    if (password !== confirm) {
      setAuthError('Les mots de passe ne correspondent pas.')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setAuthError(json.error || 'Erreur inscription')
        setAuthLoading(false)
        return
      }

      saveSession(json.token, json.user)
      setCurrentUser(json.user)
      setAuthed(true)
    } catch {
      setAuthError('Erreur de connexion')
    }

    setAuthLoading(false)
  }

  function logout() {
    clearSession()
    setAuthed(false)
    setCurrentUser(null)
    setWatchlist([])
    setWatched([])
  }

  async function addItem() {
    if (!addTitle.trim()) {
      setAddMsg('error:Entrez un titre.')
      return
    }

    try {
      await api('POST', '/auth/watchlist', {
        title: addTitle,
        type: addType,
        poster: addPoster,
        year: addYear,
      })

      setAddTitle('')
      setAddPoster('')
      setAddYear('')
      setAddMsg('ok:Ajouté !')
      setTimeout(() => setAddMsg(''), 2500)
      loadData()
    } catch (e) {
      setAddMsg('error:' + e.message)
    }
  }

  async function deleteItem(id) {
    if (!confirm('Supprimer ce titre ?')) return

    try {
      await api('DELETE', `/auth/watchlist/${id}`)
      loadData()
      showToast('Supprimé.')
    } catch (err) {
      showToast('Erreur suppression')
    }
  }

  async function moveItem(id, dir) {
    try {
      await api('PUT', `/auth/watchlist/${id}`, { dir })
      loadData()
    } catch (err) {
      showToast('Erreur déplacement')
    }
  }

  async function markWatched() {
    if (!currentRating) {
      showToast("Attribuez d'abord une note !")
      return
    }

    const item = watchlist[watchIdx]
    if (!item) return

    try {
      await api('POST', '/auth/watchlist/watched', {
        itemId: item.id,
        rating: currentRating,
        comment,
      })

      showToast('✓ Enregistré !')
      loadData()
    } catch (e) {
      showToast('Erreur: ' + e.message)
    }
  }

  async function saveAndNext() {
    if (currentRating > 0 || comment.trim()) {
      await markWatched()
    }

    if (watchIdx < watchlist.length - 1) {
      setWatchIdx(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      showToast('🎉 Marathon terminé !')
    }
  }

  function goWatch(id) {
    const idx = watchlist.findIndex(w => w.id === id)
    if (idx >= 0) {
      setWatchIdx(idx)
      setPage('regarder')
    }
  }

  const seenItemIds = [...new Set(watched.map(w => w.item_id))]

  let listeItems = [...watchlist]
  if (listeFilter === 'film') listeItems = listeItems.filter(i => i.type === 'film')
  if (listeFilter === 'serie') listeItems = listeItems.filter(i => i.type === 'serie')
  if (listeFilter === 'seen') listeItems = listeItems.filter(i => seenItemIds.includes(i.id))
  if (listeFilter === 'unseen') listeItems = listeItems.filter(i => !seenItemIds.includes(i.id))

  let vuEntries = [...watched]
  if (vuFilter === 'me') vuEntries = vuEntries.filter(e => e.user_id === currentUser?.id)

  const currentItem = watchlist[watchIdx] || null
  const myWatchEntry = currentItem
    ? watched.find(w => w.item_id === currentItem.id && w.user_id === currentUser?.id)
    : null

  const anySeen = currentItem ? seenItemIds.includes(currentItem.id) : false

  if (!authed) {
    return (
      <>
        <Head>
          <title>CinéMarathon</title>
        </Head>

        <style>{globalCss}</style>

        <div className="auth-screen">
          <div className="auth-box">
            <div className="auth-logo">
              <h1>CINÉMARATHON</h1>
              <p>Votre marathon Marvel</p>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('login')
                  setAuthError('')
                }}
              >
                Connexion
              </button>

              <button
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('register')
                  setAuthError('')
                }}
              >
                Inscription
              </button>
            </div>

            {authTab === 'login' ? (
              <div>
                <div className="form-group">
                  <label>Pseudo</label>
                  <input id="login-pseudo" type="text" placeholder="Votre pseudo" />
                </div>

                <div className="form-group">
                  <label>Mot de passe</label>
                  <input id="login-password" type="password" placeholder="••••••••" />
                </div>

                <button className="btn-primary" onClick={login} disabled={authLoading}>
                  {authLoading ? 'Connexion…' : 'Entrer dans la salle'}
                </button>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label>Pseudo</label>
                  <input id="reg-pseudo" type="text" placeholder="Choisissez un pseudo" />
                </div>

                <div className="form-group">
                  <label>Mot de passe</label>
                  <input id="reg-password" type="password" placeholder="Au moins 4 caractères" />
                </div>

                <div className="form-group">
                  <label>Confirmer</label>
                  <input id="reg-confirm" type="password" placeholder="••••••••" />
                </div>

                <button className="btn-primary" onClick={register} disabled={authLoading}>
                  {authLoading ? 'Création…' : 'Créer mon compte'}
                </button>
              </div>
            )}

            {authError && <div className="auth-error">{authError}</div>}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>CinéMarathon</title>
      </Head>

      <style>{globalCss}</style>

      <div className="topbar">
        <div className="topbar-logo">CINÉMARATHON</div>

        <div className="topbar-user">
          <div className="avatar">{currentUser?.pseudo?.[0]?.toUpperCase()}</div>
          <span>{currentUser?.pseudo}</span>
          <button className="btn-logout" onClick={logout}>Quitter</button>
        </div>
      </div>

      <nav className="nav">
        {[
          ['liste', '🎬 Liste'],
          ['regarder', '▶ Regarder'],
          ['vu', '✓ Déjà vu'],
          ['admin', '⚙ Admin'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`nav-btn ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {page === 'liste' && (
        <main className="page">
          <h1>Liste du marathon</h1>
          <p className="subtitle">
            {seenItemIds.length} / {watchlist.length} visionné(s)
          </p>

          <div className="filters">
            {[
              ['all', 'Tous'],
              ['film', 'Films'],
              ['serie', 'Séries'],
              ['unseen', 'Non vus'],
              ['seen', 'Vus'],
            ].map(([f, label]) => (
              <button
                key={f}
                className={`filter-btn ${listeFilter === f ? 'active' : ''}`}
                onClick={() => setListeFilter(f)}
              >
                {label}
              </button>
            ))}
          </div>

          {listeItems.length === 0 ? (
            <div className="empty">Aucun titre à afficher.</div>
          ) : (
            <div className="grid">
              {listeItems.map(item => {
                const isSeen = seenItemIds.includes(item.id)
                const myR = watched.find(
                  w => w.item_id === item.id && w.user_id === currentUser?.id
                )

                return (
                  <div key={item.id} className="card" onClick={() => goWatch(item.id)}>
                    <div className="badge">#{item.order}</div>
                    {isSeen && <div className="seen">✓ Vu</div>}

                    {item.poster ? (
                      <img src={item.poster} alt={item.title} />
                    ) : (
                      <div className="poster-fallback">{item.type === 'film' ? '🎬' : '📺'}</div>
                    )}

                    <div className="card-body">
                      <h3>{item.title}</h3>
                      <p>
                        {item.type === 'film' ? 'Film' : 'Série'}
                        {item.year ? ` · ${item.year}` : ''}
                        {myR ? ` · ★ ${myR.rating}/10` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      )}

      {page === 'regarder' && (
        <main className="page watch-page">
          {watchlist.length === 0 ? (
            <div className="empty">Aucun titre. Ajoutez-en dans Admin.</div>
          ) : (
            <>
              <p className="subtitle">
                {watchIdx + 1} / {watchlist.length}
              </p>

              <div className="watch-card">
                <button onClick={() => setWatchIdx(i => Math.max(0, i - 1))}>‹</button>

                <div className="poster-big">
                  {currentItem?.poster ? (
                    <img src={currentItem.poster} alt={currentItem.title} />
                  ) : (
                    <div className="poster-fallback big">
                      {currentItem?.type === 'film' ? '🎬' : '📺'}
                    </div>
                  )}

                  {anySeen && <div className="overlay">✓ Déjà vu</div>}
                </div>

                <button onClick={() => setWatchIdx(i => Math.min(watchlist.length - 1, i + 1))}>›</button>
              </div>

              <h1>{currentItem?.title}</h1>
              <p className="subtitle">
                {currentItem?.type === 'film' ? 'Film' : 'Série'}
                {currentItem?.year ? ` · ${currentItem.year}` : ''}
              </p>

              <div className="rating">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(i => (
                  <span
                    key={i}
                    className={i <= (hoverRating || currentRating) ? 'star active' : 'star'}
                    onClick={() => setCurrentRating(i)}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    ★
                  </span>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Vos impressions…"
              />

              <div className="actions">
                <button onClick={markWatched}>
                  {myWatchEntry ? 'Modifier' : 'Marquer vu'}
                </button>

                <button onClick={saveAndNext}>
                  {watchIdx === watchlist.length - 1 ? 'Terminer' : 'Suivant'}
                </button>
              </div>
            </>
          )}
        </main>
      )}

      {page === 'vu' && (
        <main className="page">
          <h1>Déjà vus</h1>

          <div className="filters">
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

          {vuEntries.length === 0 ? (
            <div className="empty">Aucune note pour le moment.</div>
          ) : (
            <div className="vu-list">
              {vuEntries.map(entry => {
                const item = watchlist.find(w => w.id === entry.item_id)
                if (!item) return null

                return (
                  <div key={entry.id} className="vu-card">
                    <strong>{item.title}</strong>
                    <p>
                      {entry.rating}/10 par {entry.pseudo}
                    </p>
                    {entry.comment && <em>{entry.comment}</em>}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      )}

      {page === 'admin' && (
        <main className="page">
          <h1>Administration</h1>

          <section className="admin-box">
            <h2>Ajouter un titre</h2>

            <input value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Titre" />

            <select value={addType} onChange={e => setAddType(e.target.value)}>
              <option value="film">Film</option>
              <option value="serie">Série</option>
            </select>

            <input value={addPoster} onChange={e => setAddPoster(e.target.value)} placeholder="URL affiche" />
            <input value={addYear} onChange={e => setAddYear(e.target.value)} placeholder="Année" />

            <button onClick={addItem}>Ajouter</button>

            {addMsg && (
              <p className={addMsg.startsWith('ok:') ? 'ok' : 'err'}>
                {addMsg.slice(3)}
              </p>
            )}
          </section>

          <section className="admin-box">
            <h2>Liste actuelle</h2>

            {watchlist.map((item, idx) => (
              <div key={item.id} className="admin-item">
                <span>{item.order}</span>
                <strong>{item.title}</strong>

                <button onClick={() => moveItem(item.id, -1)} disabled={idx === 0}>▲</button>
                <button onClick={() => moveItem(item.id, 1)} disabled={idx === watchlist.length - 1}>▼</button>
                <button onClick={() => deleteItem(item.id)}>✕</button>
              </div>
            ))}
          </section>
        </main>
      )}

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </>
  )
}

const globalCss = `
:root {
  --gold: #c9a84c;
  --bg: #0a0a0a;
  --bg2: #111;
  --bg3: #1a1a1a;
  --text: #f0ead6;
  --muted: #9b9080;
  --border: rgba(201,168,76,.25);
  --red: #e05252;
  --green: #52c47a;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
}

button, input, select, textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-box {
  width: 420px;
  max-width: 92vw;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px;
}

.auth-logo {
  text-align: center;
  margin-bottom: 24px;
}

.auth-logo h1 {
  color: var(--gold);
  letter-spacing: 2px;
}

.auth-logo p,
.subtitle {
  color: var(--muted);
}

.auth-tabs {
  display: flex;
  background: var(--bg3);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.auth-tab {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 10px;
  border-radius: 10px;
}

.auth-tab.active {
  background: var(--gold);
  color: #000;
  font-weight: 700;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  color: var(--muted);
  margin-bottom: 6px;
  font-size: 13px;
}

input, select, textarea {
  width: 100%;
  background: var(--bg3);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

textarea {
  min-height: 100px;
  resize: vertical;
}

.btn-primary,
.admin-box button,
.actions button {
  background: var(--gold);
  color: #000;
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 700;
}

.auth-error,
.err {
  color: var(--red);
}

.ok {
  color: var(--green);
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 16px 28px;
}

.topbar-logo {
  color: var(--gold);
  font-weight: 900;
  letter-spacing: 2px;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  background: var(--gold);
  color: #000;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.btn-logout {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
}

.nav {
  display: flex;
  gap: 8px;
  padding: 12px 28px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
}

.nav-btn {
  background: transparent;
  color: var(--muted);
  border: 0;
  padding: 10px 12px;
}

.nav-btn.active {
  color: var(--gold);
  border-bottom: 2px solid var(--gold);
}

.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0;
}

.filter-btn {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 16px;
}

.filter-btn.active {
  background: var(--gold);
  color: #000;
  font-weight: 700;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.card {
  position: relative;
  overflow: hidden;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.card img,
.poster-fallback {
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
}

.poster-fallback {
  display: grid;
  place-items: center;
  font-size: 48px;
  background: var(--bg3);
}

.card-body {
  padding: 12px;
}

.card h3 {
  margin: 0 0 6px;
  font-size: 15px;
}

.card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.badge,
.seen {
  position: absolute;
  top: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.badge {
  left: 8px;
  background: #000;
  color: var(--gold);
}

.seen {
  right: 8px;
  background: var(--green);
  color: #000;
}

.watch-page {
  max-width: 600px;
  text-align: center;
}

.watch-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.watch-card button {
  background: transparent;
  border: 0;
  color: var(--gold);
  font-size: 56px;
}

.poster-big {
  position: relative;
  flex: 1;
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg3);
}

.poster-big img {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
}

.poster-fallback.big {
  height: 420px;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: grid;
  place-items: center;
  color: var(--green);
  font-size: 24px;
  font-weight: 800;
}

.rating {
  margin: 20px 0;
}

.star {
  color: #333;
  font-size: 28px;
  cursor: pointer;
}

.star.active {
  color: var(--gold);
}

.actions {
  display: flex;
  gap: 12px;
}

.actions button {
  flex: 1;
}

.vu-list {
  display: grid;
  gap: 12px;
}

.vu-card,
.admin-box {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 18px;
}

.admin-item {
  display: grid;
  grid-template-columns: 40px 1fr 42px 42px 42px;
  gap: 8px;
  align-items: center;
  background: var(--bg3);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 50px 10px;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translate(-50%, 120px);
  background: var(--bg3);
  border: 1px solid var(--gold);
  padding: 12px 24px;
  border-radius: 999px;
  transition: transform .25s;
}

.toast.show {
  transform: translate(-50%, 0);
}

@media (max-width: 700px) {
  .nav {
    overflow-x: auto;
  }

  .admin-item {
    grid-template-columns: 30px 1fr;
  }

  .admin-item button {
    margin-top: 6px;
  }
}
`
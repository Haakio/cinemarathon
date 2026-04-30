import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'

// ─── API helpers ───────────────────────────────────────────
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('cm_token') : null }
function getUser()  { try { return JSON.parse(localStorage.getItem('cm_user')) } catch { return null } }
function saveSession(token, user) { localStorage.setItem('cm_token', token); localStorage.setItem('cm_user', JSON.stringify(user)) }
function clearSession() { localStorage.removeItem('cm_token'); localStorage.removeItem('cm_user') }

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
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authTab, setAuthTab] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [page, setPage] = useState('liste')
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
  const [addMsg, setAddMsg] = useState('')

  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  // Restore session
  useEffect(() => {
    const user = getUser()
    const token = getToken()
    if (user && token) { setCurrentUser(user); setAuthed(true) }
  }, [])

  const loadData = useCallback(async () => {
    if (!authed) return
    setLoading(true)
    try {
      const [wl, wd] = await Promise.all([api('GET', '/watchlist'), api('GET', '/watched')])
      setWatchlist(wl)
      setWatched(wd)
    } catch {}
    setLoading(false)
  }, [authed])

  useEffect(() => { if (authed) loadData() }, [authed, loadData])

  // Reload watched/watchlist when switching pages
  useEffect(() => { if (authed) loadData() }, [page])

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

  // ─── AUTH ───────────────────────────────────────────────
  async function login() {
    const pseudo = document.getElementById('login-pseudo').value.trim()
    const password = document.getElementById('login-password').value
    if (!pseudo || !password) { setAuthError('Remplissez tous les champs.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      const data = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pseudo, password }) })
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
      const data = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pseudo, password }) })
      const json = await data.json()
      if (!data.ok) { setAuthError(json.error); setAuthLoading(false); return }
      saveSession(json.token, json.user)
      setCurrentUser(json.user); setAuthed(true)
    } catch { setAuthError('Erreur de connexion') }
    setAuthLoading(false)
  }

  function logout() { clearSession(); setAuthed(false); setCurrentUser(null); setWatchlist([]); setWatched([]) }

  // ─── ADMIN ──────────────────────────────────────────────
  async function addItem() {
    if (!addTitle.trim()) { setAddMsg('error:Entrez un titre.'); return }
    try {
      await api('POST', '/watchlist', { title: addTitle, type: addType, poster: addPoster, year: addYear })
      setAddTitle(''); setAddPoster(''); setAddYear(''); setAddMsg('ok:Ajouté !')
      setTimeout(() => setAddMsg(''), 2500)
      loadData()
    } catch (e) { setAddMsg('error:' + e.message) }
  }

  async function deleteItem(id) {
    if (!confirm('Supprimer ce titre ?')) return
    try { await api('DELETE', `/watchlist/${id}`); loadData(); showToast('Supprimé.') } catch {}
  }

  async function moveItem(id, dir) {
    try { await api('PUT', `/watchlist/${id}`, { dir }); loadData() } catch {}
  }

  // ─── REGARDER ───────────────────────────────────────────
  async function markWatched() {
    if (!currentRating) { showToast('Attribuez d\'abord une note !'); return }
    const item = watchlist[watchIdx]
    try {
      await api('POST', '/watched', { itemId: item.id, rating: currentRating, comment })
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

  // ─── DERIVED ────────────────────────────────────────────
  const seenItemIds = [...new Set(watched.map(w => w.item_id))]

  let listeItems = [...watchlist]
  if (listeFilter === 'film') listeItems = listeItems.filter(i => i.type === 'film')
  if (listeFilter === 'serie') listeItems = listeItems.filter(i => i.type === 'serie')
  if (listeFilter === 'seen') listeItems = listeItems.filter(i => seenItemIds.includes(i.id))
  if (listeFilter === 'unseen') listeItems = listeItems.filter(i => !seenItemIds.includes(i.id))

  let vuEntries = [...watched]
  if (vuFilter === 'me') vuEntries = vuEntries.filter(e => e.user_id === currentUser?.id)

  const currentItem = watchlist[watchIdx] || null
  const myWatchEntry = currentItem ? watched.find(w => w.item_id === currentItem.id && w.user_id === currentUser?.id) : null
  const anySeen = currentItem ? seenItemIds.includes(currentItem.id) : false

  // ──────────────────────────────────────────────────────────
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
          <div className="avatar">{currentUser?.pseudo?.[0]?.toUpperCase()}</div>
          <span className="user-name">{currentUser?.pseudo}</span>
          <button className="btn-logout" onClick={logout}>Quitter</button>
        </div>
      </div>

      {/* NAV */}
      <nav className="nav">
        {[['liste','🎬 Liste'],['regarder','▶ Regarder'],['vu','✓ Déjà vu'],['admin','⚙ Admin']].map(([id, label]) => (
          <button key={id} className={`nav-btn ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>{label}</button>
        ))}
      </nav>

      {/* ── LISTE ── */}
      {page === 'liste' && (
        <div className="page">
          <h1 className="page-title">Liste du marathon</h1>
          <p className="page-subtitle">{watchlist.length > 0 ? `${seenItemIds.length} / ${watchlist.length} visionné${seenItemIds.length > 1 ? 's' : ''}` : "Ajoutez des titres depuis l'onglet Admin"}</p>
          <div className="stats-row">
            {[['Titres', watchlist.length], ['Vus', seenItemIds.length], ['Restants', watchlist.length - seenItemIds.length],
              ['Films', watchlist.filter(w => w.type === 'film').length], ['Séries', watchlist.filter(w => w.type === 'serie').length]
            ].map(([lbl, val]) => (
              <div key={lbl} className="stat-chip"><div className="val">{val}</div><div className="lbl">{lbl}</div></div>
            ))}
          </div>
          <div className="list-filters">
            {[['all','Tous'],['film','Films'],['serie','Séries'],['unseen','Non vus'],['seen','Vus']].map(([f, label]) => (
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
                        ? <img className="wl-card-poster" src={item.poster} alt={item.title} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                        : null}
                      <div className="wl-card-poster-placeholder" style={item.poster ? {display:'none'} : {}}>
                        {item.type === 'film' ? '🎬' : '📺'}
                      </div>
                      <div className="wl-card-info">
                        <div className="wl-card-title">{item.title}{item.year ? <span style={{color:'var(--text2)',fontWeight:400,fontSize:'11px'}}> ({item.year})</span> : null}</div>
                        <div className="wl-card-type">{item.type === 'film' ? 'Film' : 'Série'}{myR ? <span style={{color:'var(--gold)'}}> · ★ {myR.rating}/10</span> : null}</div>
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
                      <div className="watch-progress-fill" style={{width: watchlist.length > 0 ? `${(seenItemIds.length/watchlist.length*100).toFixed(1)}%` : '0%'}} />
                    </div>
                  </div>

                  {/* CAROUSEL: [←] [POSTER] [→] */}
                  <div className="carousel-row">
                    <button className="carousel-arrow" onClick={() => setWatchIdx(i => Math.max(0, i-1))} disabled={watchIdx === 0}>‹</button>

                    <div className="watch-poster-wrap">
                      {currentItem?.poster
                        ? <img id="watch-poster" src={currentItem.poster} alt={currentItem.title}
                            onError={e => { e.target.style.display='none'; document.getElementById('watch-ph').style.display='flex' }} />
                        : null}
                      <div id="watch-ph" className="watch-poster-placeholder" style={currentItem?.poster ? {display:'none'} : {}}>
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

                    <button className="carousel-arrow" onClick={() => setWatchIdx(i => Math.min(watchlist.length-1, i+1))} disabled={watchIdx === watchlist.length-1}>›</button>
                  </div>

                  {/* Counter */}
                  <div className="watch-counter-row">
                    <span className="watch-counter">{watchIdx + 1} / {watchlist.length}</span>
                  </div>

                  {/* RATING */}
                  <div className="rating-section">
                    <div className="rating-label">Votre note</div>
                    <div className="stars-row">
                      {Array.from({length:10},(_,i)=>i+1).map(i => (
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
                      style={myWatchEntry ? {borderColor:'var(--gold)',color:'var(--gold)'} : {}}>
                      {myWatchEntry ? '✓ Modifier' : '✓ Marquer vu'}
                    </button>
                    <button className="btn-next" onClick={saveAndNext}>
                      {watchIdx === watchlist.length - 1 ? 'TERMINER ✓' : 'SUIVANT →'}
                    </button>
                  </div>
                  {myWatchEntry && (
                    <div style={{textAlign:'center',marginTop:'10px',fontSize:'12px',color:'var(--text2)'}}>
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
            <button className={`filter-btn ${vuFilter === 'all' ? 'active' : ''}`} onClick={() => setVuFilter('all')}>Tout le monde</button>
            <button className={`filter-btn ${vuFilter === 'me' ? 'active' : ''}`} onClick={() => setVuFilter('me')}>{currentUser?.pseudo} seulement</button>
          </div>
          {vuEntries.length === 0
            ? <div className="empty-state"><div className="icon">⭐</div><p>Aucune note pour le moment.</p></div>
            : <div className="vu-list">
                {vuEntries.map(entry => {
                  const item = watchlist.find(w => w.id === entry.item_id)
                  if (!item) return null
                  const stars = '★'.repeat(Math.round(entry.rating/2)) + '☆'.repeat(5-Math.round(entry.rating/2))
                  return (
                    <div key={entry.id} className="vu-card">
                      {item.poster
                        ? <img className="vu-poster" src={item.poster} alt={item.title} onError={e => { e.target.style.display='none' }} />
                        : <div className="vu-poster-ph">{item.type==='film'?'🎬':'📺'}</div>}
                      <div className="vu-info">
                        <div className="vu-top">
                          <div>
                            <div className="vu-title">{item.title}{item.year ? <span style={{fontSize:'14px',fontWeight:400,color:'var(--text2)'}}> ({item.year})</span> : null}</div>
                            <div className="vu-type">{item.type === 'film' ? 'Film' : 'Série'}</div>
                          </div>
                          <div className="vu-rating-display">
                            <span className="vu-stars">{stars}</span>
                            <span className="vu-num">{entry.rating}/10</span>
                          </div>
                        </div>
                        <div className="vu-date">Vu le {new Date(entry.watched_at).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}</div>
                        {entry.comment && <div className="vu-comment">{entry.comment}</div>}
                        <div className="vu-user-tag">Par <span style={{color:'var(--gold)',fontWeight:600}}>{entry.pseudo}</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* ── ADMIN ── */}
      {page === 'admin' && (
        <div className="page">
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Gérer la liste du marathon</p>
          <div className="admin-grid">
            <div className="admin-card">
              <h2>Ajouter un titre</h2>
              <div className="admin-form-group"><label>Titre *</label><input className="admin-input" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Ex: Avengers: Endgame" onKeyDown={e => e.key === 'Enter' && addItem()} /></div>
              <div className="admin-form-group">
                <label>Type *</label>
                <select className="admin-select" value={addType} onChange={e => setAddType(e.target.value)}>
                  <option value="film">🎬 Film</option>
                  <option value="serie">📺 Série</option>
                </select>
              </div>
              <div className="admin-form-group"><label>URL de l'affiche (optionnel)</label><input className="admin-input" value={addPoster} onChange={e => setAddPoster(e.target.value)} placeholder="https://image.tmdb.org/…" /></div>
              {addPoster && <img src={addPoster} style={{width:'70px',aspectRatio:'2/3',borderRadius:'6px',objectFit:'cover',marginBottom:'12px',border:'1px solid var(--border)'}} onError={e => e.target.style.display='none'} alt="preview" />}
              <div className="admin-form-group"><label>Année (optionnel)</label><input className="admin-input" value={addYear} onChange={e => setAddYear(e.target.value)} placeholder="2019" maxLength={4} /></div>
              <button className="btn-add" onClick={addItem}>+ Ajouter à la liste</button>
              {addMsg && <div style={{marginTop:'10px',fontSize:'13px',textAlign:'center',color: addMsg.startsWith('ok:') ? 'var(--green)' : 'var(--red)'}}>{addMsg.slice(3)}</div>}
            </div>
            <div className="admin-card">
              <h2>Liste actuelle ({watchlist.length})</h2>
              {watchlist.length === 0
                ? <div style={{textAlign:'center',padding:'40px 0',color:'var(--text2)',fontSize:'14px'}}>Aucun titre pour le moment</div>
                : <div className="admin-list">
                    {watchlist.map((item, idx) => (
                      <div key={item.id} className="admin-item">
                        <span className="admin-item-num">{item.order}</span>
                        {item.poster ? <img src={item.poster} style={{width:'28px',aspectRatio:'2/3',borderRadius:'4px',objectFit:'cover'}} onError={e=>e.target.style.display='none'} alt="" /> : <span style={{fontSize:'18px'}}>{item.type==='film'?'🎬':'📺'}</span>}
                        <div className="admin-item-info">
                          <div className="admin-item-title">{item.title}{item.year ? ` (${item.year})` : ''}</div>
                          <div className="admin-item-type">{item.type === 'film' ? 'Film' : 'Série'}</div>
                        </div>
                        <button className="btn-up" onClick={() => moveItem(item.id, -1)} disabled={idx===0}>▲</button>
                        <button className="btn-down" onClick={() => moveItem(item.id, 1)} disabled={idx===watchlist.length-1}>▼</button>
                        <button className="btn-del" onClick={() => deleteItem(item.id)}>✕</button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>
      )}

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
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden; }
  input, select, textarea, button { font-family:'DM Sans',sans-serif; }

  /* AUTH */
  .auth-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%); }
  .auth-box { background:var(--bg2); border:1px solid var(--border); border-radius:20px; padding:48px 40px; width:420px; max-width:95vw; }
  .auth-logo { text-align:center; margin-bottom:32px; }
  .auth-logo h1 { font-family:'Playfair Display',serif; font-size:36px; font-weight:900; background:linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:2px; }
  .auth-logo p { color:var(--text2); font-size:13px; margin-top:4px; letter-spacing:3px; text-transform:uppercase; }
  .auth-tabs { display:flex; background:var(--bg3); border-radius:10px; padding:4px; margin-bottom:24px; }
  .auth-tab { flex:1; padding:10px; text-align:center; border-radius:8px; cursor:pointer; font-size:14px; font-weight:500; transition:all 0.2s; color:var(--text2); border:none; background:none; }
  .auth-tab.active { background:var(--gold); color:#000; font-weight:600; }
  .form-group { margin-bottom:16px; }
  .form-group label { display:block; font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .form-group input { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 16px; color:var(--text); font-size:15px; outline:none; transition:border-color 0.2s; }
  .form-group input:focus { border-color:var(--gold); }
  .btn-primary { width:100%; padding:14px; background:var(--gold); color:#000; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; letter-spacing:1px; text-transform:uppercase; transition:all 0.2s; margin-top:8px; }
  .btn-primary:hover:not(:disabled) { background:var(--gold-light); }
  .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
  .auth-error { color:var(--red); font-size:13px; text-align:center; margin-top:12px; }

  /* APP */
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 32px; border-bottom:1px solid var(--border); background:rgba(10,10,10,0.95); backdrop-filter:blur(10px); position:sticky; top:0; z-index:100; }
  .topbar-logo { font-family:'Playfair Display',serif; font-size:22px; font-weight:900; background:linear-gradient(135deg,var(--gold-light),var(--gold)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:2px; }
  .topbar-user { display:flex; align-items:center; gap:12px; }
  .avatar { width:36px; height:36px; border-radius:50%; background:var(--gold); color:#000; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; }
  .user-name { font-size:14px; font-weight:500; }
  .btn-logout { background:none; border:1px solid var(--border); color:var(--text2); padding:6px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:all 0.2s; }
  .btn-logout:hover { border-color:var(--red); color:var(--red); }

  .nav { display:flex; padding:0 32px; border-bottom:1px solid var(--border); background:var(--bg2); }
  .nav-btn { padding:16px 24px; background:none; border:none; border-bottom:2px solid transparent; color:var(--text2); font-size:12px; font-weight:500; cursor:pointer; letter-spacing:2px; transition:all 0.2s; text-transform:uppercase; }
  .nav-btn.active { color:var(--gold); border-bottom-color:var(--gold); }
  .nav-btn:hover:not(.active) { color:var(--text); }

  .page { padding:32px; max-width:1100px; margin:0 auto; }
  .page-title { font-family:'Playfair Display',serif; font-size:32px; font-weight:700; margin-bottom:8px; }
  .page-subtitle { color:var(--text2); font-size:14px; margin-bottom:28px; }

  /* STATS */
  .stats-row { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
  .stat-chip { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:10px 16px; text-align:center; }
  .stat-chip .val { font-family:'Playfair Display',serif; font-size:24px; font-weight:700; color:var(--gold); }
  .stat-chip .lbl { font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }

  /* LISTE */
  .list-filters { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
  .filter-btn { padding:8px 18px; border:1px solid var(--border); background:none; color:var(--text2); border-radius:20px; font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer; transition:all 0.2s; }
  .filter-btn.active, .filter-btn:hover { background:var(--gold); color:#000; border-color:var(--gold); font-weight:600; }
  .watchlist-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:16px; }
  .wl-card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; transition:transform 0.2s,border-color 0.2s; cursor:pointer; position:relative; }
  .wl-card:hover { transform:translateY(-4px); border-color:var(--gold); }
  .wl-card-poster { width:100%; aspect-ratio:2/3; object-fit:cover; display:block; }
  .wl-card-poster-placeholder { width:100%; aspect-ratio:2/3; background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:36px; }
  .wl-card-info { padding:10px; }
  .wl-card-title { font-size:13px; font-weight:600; line-height:1.3; margin-bottom:3px; }
  .wl-card-type { font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:1px; }
  .wl-card-num { position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.85); color:var(--gold); font-size:11px; font-weight:700; padding:3px 7px; border-radius:5px; font-family:'Playfair Display',serif; }
  .wl-card-seen { position:absolute; top:8px; right:8px; background:rgba(82,196,122,0.9); color:#000; font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; }

  /* REGARDER */
  .watch-container { max-width:460px; margin:0 auto; }
  .watch-progress-bar-wrap { margin-bottom:20px; }
  .watch-progress-label { display:flex; justify-content:space-between; font-size:12px; color:var(--text2); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; }
  .watch-progress-bar { height:3px; background:var(--bg3); border-radius:2px; overflow:hidden; }
  .watch-progress-fill { height:100%; background:linear-gradient(90deg,var(--gold-dark),var(--gold)); transition:width 0.5s ease; }

  /* CAROUSEL */
  .carousel-row { display:flex; align-items:center; gap:0; margin-bottom:12px; }
  .carousel-arrow { background:none; border:none; color:var(--gold); font-size:64px; cursor:pointer; padding:0 8px; line-height:1; transition:all 0.15s; user-select:none; flex-shrink:0; height:100%; display:flex; align-items:center; }
  .carousel-arrow:hover:not(:disabled) { color:var(--gold-light); transform:scale(1.1); }
  .carousel-arrow:disabled { color:var(--bg4); cursor:default; }

  .watch-poster-wrap { position:relative; border-radius:16px; overflow:hidden; flex:1; box-shadow:0 20px 60px rgba(0,0,0,0.8); aspect-ratio:2/3; max-height:380px; background:var(--bg3); }
  .watch-poster-wrap img { width:100%; height:100%; object-fit:cover; display:block; }
  .watch-poster-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:64px; background:var(--bg3); }
  .watch-poster-overlay { position:absolute; bottom:0; left:0; right:0; padding:40px 16px 16px; background:linear-gradient(to top,rgba(0,0,0,0.9),transparent); }
  .watch-num { font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:2px; }
  .watch-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:700; line-height:1.2; margin-top:4px; }
  .watch-seen-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; }
  .watch-seen-badge { background:var(--green); color:#000; font-weight:700; font-size:16px; padding:10px 24px; border-radius:30px; }

  .watch-counter-row { text-align:center; margin-bottom:16px; }
  .watch-counter { font-size:13px; color:var(--text2); }

  .rating-section { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; margin-bottom:12px; }
  .rating-label { font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
  .stars-row { display:flex; gap:2px; justify-content:center; margin-bottom:6px; }
  .star { font-size:26px; cursor:pointer; transition:transform 0.1s,color 0.1s; color:#333; line-height:1; user-select:none; }
  .star.filled { color:var(--gold); }
  .star:hover { transform:scale(1.15); }
  .rating-value { text-align:center; font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--gold); min-height:22px; }

  .comment-section { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; margin-bottom:12px; }
  .comment-label { font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
  .comment-textarea { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px; color:var(--text); font-size:14px; resize:vertical; min-height:80px; outline:none; transition:border-color 0.2s; line-height:1.5; }
  .comment-textarea:focus { border-color:var(--gold); }

  .watch-actions { display:flex; gap:10px; }
  .btn-mark { flex:1; padding:13px; background:none; border:1px solid var(--green); color:var(--green); border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; }
  .btn-mark:hover { background:var(--green); color:#000; }
  .btn-next { flex:2; padding:13px; background:var(--gold); color:#000; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; letter-spacing:2px; text-transform:uppercase; transition:all 0.2s; }
  .btn-next:hover { background:var(--gold-light); transform:translateY(-1px); }

  /* VU */
  .vu-filter-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }
  .vu-filter-label { font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; }
  .vu-list { display:flex; flex-direction:column; gap:14px; }
  .vu-card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:18px; display:flex; gap:14px; align-items:flex-start; }
  .vu-poster { width:65px; min-width:65px; aspect-ratio:2/3; border-radius:8px; object-fit:cover; }
  .vu-poster-ph { width:65px; min-width:65px; aspect-ratio:2/3; border-radius:8px; background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:22px; }
  .vu-info { flex:1; min-width:0; }
  .vu-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; flex-wrap:wrap; }
  .vu-title { font-family:'Playfair Display',serif; font-size:17px; font-weight:700; }
  .vu-type { font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
  .vu-rating-display { display:flex; align-items:center; gap:6px; background:var(--bg3); padding:5px 10px; border-radius:20px; border:1px solid var(--border); white-space:nowrap; }
  .vu-stars { color:var(--gold); font-size:12px; letter-spacing:-1px; }
  .vu-num { font-family:'Playfair Display',serif; font-weight:700; font-size:14px; color:var(--gold); }
  .vu-date { font-size:12px; color:var(--text2); margin-top:4px; }
  .vu-comment { margin-top:8px; font-size:13px; color:var(--text2); line-height:1.5; font-style:italic; border-left:2px solid var(--border); padding-left:10px; }

  /* ADMIN */
  .admin-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .admin-card { background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:28px; }
  .admin-card h2 { font-family:'Playfair Display',serif; font-size:22px; font-weight:700; margin-bottom:20px; color:var(--gold); }
  .admin-form-group { margin-bottom:14px; }
  .admin-form-group label { display:block; font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .admin-input { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:8px; padding:10px 14px; color:var(--text); font-size:14px; outline:none; transition:border-color 0.2s; }
  .admin-input:focus { border-color:var(--gold); }
  .admin-select { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:8px; padding:10px 14px; color:var(--text); font-size:14px; outline:none; cursor:pointer; appearance:none; }
  .btn-add { width:100%; padding:12px; background:var(--gold); color:#000; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; text-transform:uppercase; letter-spacing:1px; transition:all 0.2s; margin-top:6px; }
  .btn-add:hover { background:var(--gold-light); }
  .admin-list { display:flex; flex-direction:column; gap:8px; max-height:420px; overflow-y:auto; }
  .admin-item { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg3); border-radius:8px; border:1px solid var(--border); }
  .admin-item-num { font-size:11px; color:var(--gold); font-weight:700; min-width:20px; font-family:'Playfair Display',serif; }
  .admin-item-info { flex:1; min-width:0; }
  .admin-item-title { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .admin-item-type { font-size:11px; color:var(--text2); text-transform:uppercase; }
  .btn-del { background:none; border:none; color:var(--text2); cursor:pointer; font-size:14px; padding:4px; transition:color 0.2s; }
  .btn-del:hover { color:var(--red); }
  .btn-up, .btn-down { background:none; border:none; color:var(--text2); cursor:pointer; font-size:12px; padding:4px; transition:color 0.2s; }
  .btn-up:hover, .btn-down:hover { color:var(--gold); }
  .btn-up:disabled, .btn-down:disabled { opacity:0.2; cursor:default; }

  /* TOAST */
  .toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%) translateY(100px); background:var(--bg3); border:1px solid var(--gold); color:var(--text); padding:12px 24px; border-radius:30px; font-size:14px; font-weight:500; z-index:10000; transition:transform 0.3s ease; white-space:nowrap; pointer-events:none; }
  .toast.show { transform:translateX(-50%) translateY(0); }

  .empty-state { text-align:center; padding:60px 20px; color:var(--text2); }
  .empty-state .icon { font-size:48px; margin-bottom:16px; }
  .empty-state p { font-size:15px; line-height:1.6; }

  ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:var(--bg2); } ::-webkit-scrollbar-thumb { background:var(--bg4); border-radius:3px; }

  @media(max-width:700px) {
    .admin-grid { grid-template-columns:1fr; }
    .topbar { padding:12px 16px; }
    .nav { padding:0 8px; }
    .nav-btn { padding:14px 10px; font-size:10px; letter-spacing:1px; }
    .page { padding:20px 16px; }
    .watch-container { max-width:100%; }
    .carousel-arrow { font-size:44px; padding:0 4px; }
  }
`
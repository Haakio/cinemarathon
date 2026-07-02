import { useEffect, useRef, useState } from 'react'
import { api } from '../../utils/api'
import { TYPE_META } from '../../utils/constants'

const EMPTY_FORM = {
  title: '', type: 'film', poster: '', year: '', platform: '', watchUrl: '',
  synopsis: '', runtime: 0, genres: '', tmdbId: '', backdrop: '', cast: [],
}

/**
 * Administration : ajout/édition de titres avec recherche TMDB intégrée
 * (synopsis, durée, genres et casting remplis automatiquement),
 * réordonnancement, suppression, gestion des admins de room.
 */
export default function AdminView({
  currentRoom, currentRoomId, watchlist, roomMembers, setRoomMembers,
  canDeleteCurrentRoom, isGlobalAdmin, loadData, showToast,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [msg, setMsg] = useState('')

  // Réinitialisation de mot de passe (admin global uniquement)
  const [resetPseudo, setResetPseudo] = useState('')
  const [resetResult, setResetResult] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)

  // Recherche TMDB (debounce 400 ms pour limiter les appels)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [tmdbError, setTmdbError] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    const q = tmdbQuery.trim()
    if (q.length < 2) { setTmdbResults([]); return }
    setTmdbLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await api('GET', `/auth/tmdb?query=${encodeURIComponent(q)}`)
        setTmdbResults(data.results || [])
        setTmdbError('')
      } catch (e) {
        setTmdbResults([])
        setTmdbError(e.message)
      }
      setTmdbLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [tmdbQuery])

  // Fermer les résultats au clic extérieur
  useEffect(() => {
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setTmdbResults([])
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  // Changement de room : on abandonne l'édition en cours (l'item n'existe plus ici)
  useEffect(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMsg('')
  }, [currentRoomId])

  async function pickTmdbResult(result) {
    setTmdbResults([])
    setTmdbQuery('')
    try {
      const data = await api('GET', `/auth/tmdb?mediaType=${result.mediaType}&tmdbId=${result.tmdbId}`)
      const d = data.details
      setForm(prev => ({
        ...prev,
        title: d.title,
        type: result.mediaType === 'movie' ? 'film' : (prev.type === 'anime' ? 'anime' : 'serie'),
        poster: d.poster,
        year: d.year,
        synopsis: d.synopsis,
        runtime: d.runtime,
        genres: d.genres,
        tmdbId: String(d.tmdbId),
        backdrop: d.backdrop,
        cast: d.cast,
      }))
      showToast('Fiche TMDB importée ✓')
    } catch (e) {
      showToast('TMDB: ' + e.message)
    }
  }

  async function addItem() {
    if (!form.title.trim()) { setMsg('error:Entrez un titre.'); return }
    try {
      await api('POST', '/auth/watchlist', { roomId: currentRoomId, ...form })
      setForm(EMPTY_FORM)
      setMsg('ok:Ajouté !')
      setTimeout(() => setMsg(''), 2500)
      loadData()
    } catch (e) { setMsg('error:' + e.message) }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      type: item.type,
      poster: item.poster || '',
      year: item.year || '',
      platform: item.platform || '',
      watchUrl: item.watch_url || '',
      synopsis: item.synopsis || '',
      runtime: item.runtime || 0,
      genres: item.genres || '',
      tmdbId: item.tmdb_id || '',
      backdrop: item.backdrop || '',
      cast: (() => { try { return JSON.parse(item.cast_json || '[]') } catch { return [] } })(),
    })
    setMsg('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMsg('')
  }

  async function saveEdit() {
    if (!form.title.trim()) { setMsg('error:Entrez un titre.'); return }
    try {
      await api('PUT', `/auth/watchlist/${editingId}`, { roomId: currentRoomId, ...form })
      setMsg('ok:Modifié !')
      cancelEdit()
      loadData()
    } catch (e) { setMsg('error:' + e.message) }
  }

  async function deleteItem(id) {
    if (!confirm('Supprimer ce titre ?')) return
    try {
      await api('DELETE', `/auth/watchlist/${id}`, { roomId: currentRoomId })
      loadData()
      showToast('Supprimé.')
    } catch { }
  }

  async function moveItem(id, dir) {
    try {
      await api('PUT', `/auth/watchlist/${id}`, { roomId: currentRoomId, dir })
      loadData()
    } catch { }
  }

  async function generateResetCode() {
    if (!resetPseudo.trim()) { showToast('Entrez le pseudo du membre.'); return }
    setResetLoading(true)
    setResetResult(null)
    try {
      const data = await api('POST', '/auth/reset-code', { pseudo: resetPseudo.trim() })
      setResetResult(data)
      setResetPseudo('')
    } catch (e) {
      showToast('Réinit: ' + e.message)
    }
    setResetLoading(false)
  }

  function copyResetCode() {
    if (!resetResult?.code) return
    navigator.clipboard?.writeText(resetResult.code)
      .then(() => showToast('Code copié ✓'))
      .catch(() => showToast('Copie impossible, notez le code manuellement.'))
  }

  async function setRoomAdmin(member, makeAdmin) {
    if (!canDeleteCurrentRoom || member.user_id === currentRoom.created_by) return
    try {
      await api('POST', '/auth/rooms', {
        action: 'setRole',
        roomId: currentRoomId,
        targetUserId: member.user_id,
        role: makeAdmin ? 'admin' : 'member',
      })
      setRoomMembers(prev => prev.map(entry => (
        entry.user_id === member.user_id ? { ...entry, role: makeAdmin ? 'admin' : 'member' } : entry
      )))
      showToast(makeAdmin ? 'Admin ajouté.' : 'Admin retiré.')
    } catch (e) {
      showToast(e.message)
    }
  }

  return (
    <>
      <div className="view-head anim-up">
        <h1>Administration</h1>
        <p>Gérer la liste de la room {currentRoom.name}</p>
      </div>

      <div className="admin-grid">
        <div className="card anim-up-1">
          <h2>{editingId ? 'Modifier le titre' : 'Ajouter un titre'}</h2>

          <div className="admin-form-group tmdb-search" ref={searchRef}>
            <label>Recherche TMDB (remplit tout automatiquement)</label>
            <input
              className="admin-input"
              value={tmdbQuery}
              onChange={e => setTmdbQuery(e.target.value)}
              placeholder="Ex: Avengers Endgame..."
            />
            {(tmdbResults.length > 0 || tmdbLoading) && tmdbQuery.trim().length >= 2 && (
              <div className="tmdb-results">
                {tmdbLoading && <div className="search-empty">Recherche...</div>}
                {!tmdbLoading && tmdbResults.map(result => (
                  <button key={`${result.mediaType}-${result.tmdbId}`} className="tmdb-result" onClick={() => pickTmdbResult(result)}>
                    {result.poster ? <img src={result.poster} alt="" /> : <span className="sr-ph">{result.mediaType === 'movie' ? '🎬' : '📺'}</span>}
                    <span>
                      {result.title}{result.year ? ` (${result.year})` : ''}
                      <small>{result.mediaType === 'movie' ? 'Film' : 'Série'}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="tmdb-hint">
              {tmdbError
                ? `TMDB indisponible (${tmdbError}). Remplissage manuel possible ci-dessous.`
                : 'Synopsis, durée, genres et casting sont importés automatiquement.'}
            </div>
          </div>

          <div className="admin-form-group">
            <label>Titre *</label>
            <input className="admin-input" value={form.title} onChange={e => setField('title', e.target.value)}
              placeholder="Ex: Avengers: Endgame" onKeyDown={e => e.key === 'Enter' && (editingId ? saveEdit() : addItem())} />
          </div>
          <div className="admin-form-group">
            <label>Type *</label>
            <select className="admin-select" value={form.type} onChange={e => setField('type', e.target.value)}>
              <option value="film">🎬 Film</option>
              <option value="serie">📺 Série</option>
              <option value="anime">🍥 Anime</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>URL de l'affiche (optionnel)</label>
            <input className="admin-input" value={form.poster} onChange={e => setField('poster', e.target.value)} placeholder="https://image.tmdb.org/…" />
          </div>
          {form.poster && (
            <img src={form.poster} alt="preview"
              style={{ width: '70px', aspectRatio: '2/3', borderRadius: '6px', objectFit: 'cover', marginBottom: '12px', border: '1px solid var(--border)' }}
              onError={e => e.target.style.display = 'none'} />
          )}
          <div className="admin-form-group">
            <label>Année (optionnel)</label>
            <input className="admin-input" value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2019" maxLength={4} />
          </div>
          <div className="admin-form-group">
            <label>Plateforme (optionnel)</label>
            <input className="admin-input" value={form.platform} onChange={e => setField('platform', e.target.value)} placeholder="Disney+" />
          </div>
          <div className="admin-form-group">
            <label>Lien de visionnage (optionnel)</label>
            <input className="admin-input" value={form.watchUrl} onChange={e => setField('watchUrl', e.target.value)} placeholder="https://www.disneyplus.com/..." />
          </div>
          <div className="admin-form-group">
            <label>Synopsis (optionnel)</label>
            <textarea className="admin-input" style={{ minHeight: '70px', resize: 'vertical' }}
              value={form.synopsis} onChange={e => setField('synopsis', e.target.value)} placeholder="Rempli automatiquement via TMDB..." />
          </div>

          <button className="btn-add" onClick={editingId ? saveEdit : addItem}>
            {editingId ? '✓ Enregistrer les modifications' : '+ Ajouter à la liste'}
          </button>
          {editingId && (
            <button className="btn-ghost" onClick={cancelEdit}>Annuler</button>
          )}
          {msg && (
            <div className="admin-msg" style={{ color: msg.startsWith('ok:') ? 'var(--green)' : 'var(--red)' }}>
              {msg.slice(msg.indexOf(':') + 1)}
            </div>
          )}
        </div>

        <div className="card anim-up-2">
          <h2>Liste actuelle ({watchlist.length})</h2>
          {watchlist.length === 0 ? (
            <div className="admin-empty">Aucun titre pour le moment</div>
          ) : (
            <div className="admin-list">
              {watchlist.map((item, idx) => {
                const meta = TYPE_META[item.type] || TYPE_META.film
                return (
                  <div key={item.id} className="admin-item">
                    <span className="admin-item-num">{item.order}</span>
                    {item.poster
                      ? <img src={item.poster} onError={e => e.target.style.display = 'none'} alt="" />
                      : <span style={{ fontSize: '18px' }}>{meta.icon}</span>}
                    <div className="admin-item-info">
                      <div className="admin-item-title">{item.title}{item.year ? ` (${item.year})` : ''}</div>
                      <div className="admin-item-type">{meta.label}{item.tmdb_id ? ' · TMDB ✓' : ''}</div>
                    </div>
                    <button className="btn-icon" onClick={() => startEdit(item)} title="Modifier">✎</button>
                    <button className="btn-icon" onClick={() => moveItem(item.id, -1)} disabled={idx === 0} title="Monter">▲</button>
                    <button className="btn-icon" onClick={() => moveItem(item.id, 1)} disabled={idx === watchlist.length - 1} title="Descendre">▼</button>
                    <button className="btn-icon danger" onClick={() => deleteItem(item.id)} title="Supprimer">✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {isGlobalAdmin && (
          <div className="card anim-up-3">
            <h2>Mot de passe oublié</h2>
            <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.55, marginBottom: '14px' }}>
              Génère un code à usage unique (valable 30 min) et transmets-le au membre.
              Il l'utilisera via « Mot de passe oublié ? » sur l'écran de connexion.
            </p>
            <div className="admin-form-group">
              <label>Pseudo du membre</label>
              <input className="admin-input" value={resetPseudo} onChange={e => setResetPseudo(e.target.value)}
                placeholder="Ex: Matheo" onKeyDown={e => e.key === 'Enter' && generateResetCode()} />
            </div>
            <button className="btn-add" onClick={generateResetCode} disabled={resetLoading}>
              {resetLoading ? 'Génération...' : 'Générer un code'}
            </button>
            {resetResult && (
              <>
                <div className="reset-code-display">
                  <b>{resetResult.code}</b>
                  <button onClick={copyResetCode}>Copier</button>
                </div>
                <div className="tmdb-hint">
                  Code pour <strong>{resetResult.pseudo}</strong> — affiché une seule fois,
                  expire dans {resetResult.expiresInMinutes} min.
                </div>
              </>
            )}
          </div>
        )}

        {canDeleteCurrentRoom && (
          <div className="card anim-up-3">
            <h2>Admins de room</h2>
            {roomMembers.length === 0 ? (
              <div className="admin-empty">Aucun membre pour le moment</div>
            ) : (
              <div className="admin-list">
                {roomMembers.map(member => (
                  <div key={member.user_id} className="admin-member-item">
                    <div>
                      <strong>{member.pseudo || 'Membre'}</strong>
                      <span>{member.role === 'owner' ? 'Créateur' : member.role === 'admin' ? 'Admin' : 'Membre'}</span>
                    </div>
                    {member.user_id !== currentRoom.created_by && (
                      <button onClick={() => setRoomAdmin(member, member.role !== 'admin')}>
                        {member.role === 'admin' ? 'Retirer admin' : 'Ajouter admin'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

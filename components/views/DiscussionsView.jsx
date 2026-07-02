import { useCallback, useEffect, useMemo, useState } from 'react'
import Avatar from '../widgets/Avatar'
import { api } from '../../utils/api'
import { formatRelative } from '../../utils/format'
import { TYPE_META } from '../../utils/constants'

/**
 * Discussions : posts façon forum, optionnellement liés à un film de la room.
 * Chargé uniquement à l'ouverture de la vue (aucun polling — bouton Actualiser).
 */
export default function DiscussionsView({ currentRoom, currentRoomId, currentUser, isAdmin, watchlist, showToast }) {
  const [posts, setPosts] = useState([])
  const [avatars, setAvatars] = useState({})
  const [loading, setLoading] = useState(true)

  // Composeur
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [itemId, setItemId] = useState('')
  const [posting, setPosting] = useState(false)

  // Réponses
  const [replyTo, setReplyTo] = useState(null)
  const [replyBody, setReplyBody] = useState('')
  const [filterItemId, setFilterItemId] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('GET', `/auth/posts?roomId=${encodeURIComponent(currentRoomId)}`)
      setPosts(data.posts || [])
      setAvatars(data.avatars || {})
    } catch (e) {
      showToast('Discussions: ' + e.message)
    }
    setLoading(false)
  }, [currentRoomId, showToast])

  useEffect(() => { loadPosts() }, [loadPosts])

  const { roots, repliesByParent } = useMemo(() => {
    const rootPosts = posts
      .filter(p => !p.parent_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const replies = {}
    posts.filter(p => p.parent_id).forEach(p => {
      if (!replies[p.parent_id]) replies[p.parent_id] = []
      replies[p.parent_id].push(p)
    })
    return { roots: rootPosts, repliesByParent: replies }
  }, [posts])

  const visibleRoots = filterItemId ? roots.filter(p => p.item_id === filterItemId) : roots
  const itemOf = id => watchlist.find(w => w.id === id)

  async function submitPost() {
    if (!body.trim()) { showToast('Écris ton message d\'abord.'); return }
    setPosting(true)
    try {
      await api('POST', '/auth/posts', { roomId: currentRoomId, itemId: itemId || null, title, body })
      setTitle(''); setBody(''); setItemId('')
      await loadPosts()
    } catch (e) {
      showToast('Discussions: ' + e.message)
    }
    setPosting(false)
  }

  async function submitReply(parentId) {
    if (!replyBody.trim()) return
    try {
      await api('POST', '/auth/posts', { roomId: currentRoomId, parentId, body: replyBody })
      setReplyBody('')
      setReplyTo(null)
      await loadPosts()
    } catch (e) {
      showToast('Discussions: ' + e.message)
    }
  }

  async function deletePost(id) {
    if (!confirm('Supprimer ce message (et ses réponses) ?')) return
    try {
      await api('DELETE', '/auth/posts', { id, roomId: currentRoomId })
      setPosts(prev => prev.filter(p => p.id !== id && p.parent_id !== id))
    } catch (e) {
      showToast('Discussions: ' + e.message)
    }
  }

  const canDelete = post => post.user_id === currentUser?.id || isAdmin

  return (
    <>
      <div className="view-head anim-up">
        <h1>Discussions</h1>
        <p>Débattez des films de la room {currentRoom.name} — théories, scènes cultes, avis à chaud</p>
      </div>

      {/* Composeur */}
      <div className="card anim-up-1" style={{ marginBottom: '22px' }}>
        <h2>Nouveau sujet</h2>
        <div className="post-compose">
          <div className="post-compose-row">
            <input className="admin-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Titre (optionnel) — ex: La scène de la 3e minute de Backrooms 👀" maxLength={140} />
            <select className="admin-select post-film-select" value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">Sans film lié</option>
              {watchlist.map(item => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          <textarea className="admin-input" style={{ minHeight: '80px', resize: 'vertical' }}
            value={body} onChange={e => setBody(e.target.value)} maxLength={3000}
            placeholder="Votre post... (théorie, détail repéré, débat)" />
          <div className="post-compose-foot">
            <span>{body.length}/3000</span>
            <button className="btn-add" style={{ width: 'auto', padding: '10px 24px' }} onClick={submitPost} disabled={posting}>
              {posting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtre par film */}
      {watchlist.length > 0 && roots.length > 0 && (
        <div className="filters anim-up-2">
          <button className={`filter-btn ${filterItemId === '' ? 'active' : ''}`} onClick={() => setFilterItemId('')}>Tous</button>
          {[...new Set(roots.map(p => p.item_id).filter(Boolean))].map(id => {
            const item = itemOf(id)
            if (!item) return null
            return (
              <button key={id} className={`filter-btn ${filterItemId === id ? 'active' : ''}`} onClick={() => setFilterItemId(id)}>
                {(TYPE_META[item.type] || TYPE_META.film).icon} {item.title}
              </button>
            )
          })}
        </div>
      )}

      {/* Fil */}
      {loading ? (
        <div className="empty-state"><p>Chargement des discussions...</p></div>
      ) : visibleRoots.length === 0 ? (
        <div className="empty-state">
          <div className="icon">💬</div>
          <p>Aucune discussion pour le moment.<br />Lancez le premier débat !</p>
        </div>
      ) : (
        <div className="posts-list">
          {visibleRoots.map(post => {
            const item = post.item_id ? itemOf(post.item_id) : null
            const replies = repliesByParent[post.id] || []
            return (
              <article className="card post-card anim-up-2" key={post.id}>
                <div className="post-head">
                  <Avatar pseudo={post.pseudo} emoji={avatars[post.user_id]?.emoji || ''} hue={avatars[post.user_id]?.hue ?? null} url={avatars[post.user_id]?.url || ''} size={36} />
                  <div className="post-head-info">
                    <b>{post.pseudo}</b>
                    <small>{formatRelative(post.created_at)}</small>
                  </div>
                  {item && (
                    <span className="chip post-film-chip">
                      {(TYPE_META[item.type] || TYPE_META.film).icon} {item.title}
                    </span>
                  )}
                  {canDelete(post) && (
                    <button className="btn-icon danger post-delete" onClick={() => deletePost(post.id)} title="Supprimer">✕</button>
                  )}
                </div>
                {post.title && <h3 className="post-title">{post.title}</h3>}
                <p className="post-body">{post.body}</p>

                {/* Réponses */}
                {replies.length > 0 && (
                  <div className="post-replies">
                    {replies.map(reply => (
                      <div className="post-reply" key={reply.id}>
                        <Avatar pseudo={reply.pseudo} emoji={avatars[reply.user_id]?.emoji || ''} hue={avatars[reply.user_id]?.hue ?? null} url={avatars[reply.user_id]?.url || ''} size={26} />
                        <div className="post-reply-body">
                          <div className="post-reply-meta">
                            <b>{reply.pseudo}</b>
                            <small>{formatRelative(reply.created_at)}</small>
                            {canDelete(reply) && (
                              <button className="post-reply-delete" onClick={() => deletePost(reply.id)}>✕</button>
                            )}
                          </div>
                          <p>{reply.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Répondre */}
                {replyTo === post.id ? (
                  <div className="post-reply-compose">
                    <input className="admin-input" value={replyBody} onChange={e => setReplyBody(e.target.value)}
                      placeholder="Votre réponse..." maxLength={3000} autoFocus
                      onKeyDown={e => e.key === 'Enter' && submitReply(post.id)} />
                    <button className="btn-add" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => submitReply(post.id)}>➤</button>
                    <button className="btn-ghost" style={{ width: 'auto', marginTop: 0, padding: '10px 14px' }}
                      onClick={() => { setReplyTo(null); setReplyBody('') }}>Annuler</button>
                  </div>
                ) : (
                  <button className="post-reply-toggle" onClick={() => { setReplyTo(post.id); setReplyBody('') }}>
                    💬 Répondre{replies.length ? ` (${replies.length})` : ''}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

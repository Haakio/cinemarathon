import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '../widgets/Avatar'
import UserTag from '../widgets/UserTag'
import Modal from '../modals/Modal'
import { api } from '../../utils/api'
import { formatRelative } from '../../utils/format'
import { TYPE_META } from '../../utils/constants'
import { readAsDataURL, downscaleImage, extractImageUrl } from '../../utils/image'

/**
 * Discussions v2 : un HUB de sujets (cartes cliquables), et pour chaque
 * sujet une page de conversation dédiée avec envoi d'images et de GIF
 * (upload compressé ou lien Tenor/Imgur collé, embarqué automatiquement).
 * Popup règles/fonctionnalités à la première visite.
 * Coût : chargement à l'ouverture + poll léger 5s UNIQUEMENT dans un sujet ouvert.
 */
export default function DiscussionsView({ currentRoom, currentRoomId, currentUser, isAdmin, watchlist, showToast, askConfirm }) {
  const [posts, setPosts] = useState([])
  const [avatars, setAvatars] = useState({})
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null) // sujet ouvert (null = hub)
  const [rulesOpen, setRulesOpen] = useState(false)

  // Composeur de sujet (hub)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [itemId, setItemId] = useState('')
  const [posting, setPosting] = useState(false)

  // Composeur de réponse (sujet ouvert)
  const [replyBody, setReplyBody] = useState('')
  const [replyImage, setReplyImage] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef(null)
  const threadEndRef = useRef(null)

  // Règles à la première visite
  useEffect(() => {
    if (!currentUser?.id) return
    if (localStorage.getItem(`cm_disc_rules_${currentUser.id}`) !== '1') setRulesOpen(true)
  }, [currentUser])

  function closeRules() {
    if (currentUser?.id) localStorage.setItem(`cm_disc_rules_${currentUser.id}`, '1')
    setRulesOpen(false)
  }

  const loadPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await api('GET', `/auth/posts?roomId=${encodeURIComponent(currentRoomId)}`)
      setPosts(data.posts || [])
      setAvatars(data.avatars || {})
    } catch (e) {
      if (!silent) showToast('Discussions: ' + e.message)
    }
    if (!silent) setLoading(false)
  }, [currentRoomId, showToast])

  useEffect(() => { setOpenId(null); loadPosts() }, [loadPosts])

  // Dans un sujet ouvert : poll discret 5s pour voir arriver les réponses
  useEffect(() => {
    if (!openId) return
    const timer = setInterval(() => {
      if (!document.hidden) loadPosts(true)
    }, 5000)
    return () => clearInterval(timer)
  }, [openId, loadPosts])

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

  const itemOf = id => watchlist.find(w => w.id === id)
  const avatarOf = post => avatars[post.user_id] || {}
  const canDelete = post => post.user_id === currentUser?.id || isAdmin
  const openPost = openId ? posts.find(p => p.id === openId) : null
  const openReplies = openId ? (repliesByParent[openId] || []) : []

  // Scroll en bas du fil quand une réponse arrive
  useEffect(() => {
    if (openId) threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [openId, openReplies.length])

  /** Rend le texte + l'image (jointe ou lien image détecté dans le texte). */
  function renderContent(post, big = false) {
    const urlInText = !post.image ? extractImageUrl(post.body) : null
    const image = post.image || urlInText
    const text = urlInText ? post.body.replace(urlInText, '').trim() : post.body
    return (
      <>
        {text && <p className={big ? 'post-body' : 'thread-msg-text'}>{text}</p>}
        {image && <img className="post-image" src={image} alt="" loading="lazy" onError={e => { e.target.style.display = 'none' }} />}
      </>
    )
  }

  async function handleAttach(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Choisissez une image.'); return }
    try {
      if (file.type === 'image/gif') {
        if (file.size > 150 * 1024) { showToast('GIF trop lourd (max 150 Ko) — collez plutôt un lien Tenor.'); return }
        setReplyImage(await readAsDataURL(file))
      } else {
        const dataUrl = await downscaleImage(file, 640, 0.82)
        if (dataUrl.length > 200000) { showToast('Image trop lourde après compression.'); return }
        setReplyImage(dataUrl)
      }
    } catch { showToast('Impossible de lire cette image.') }
  }

  async function submitPost() {
    if (!body.trim()) { showToast('Écris ton message d\'abord.'); return }
    setPosting(true)
    try {
      await api('POST', '/auth/posts', { roomId: currentRoomId, itemId: itemId || null, title, body })
      setTitle(''); setBody(''); setItemId('')
      await loadPosts()
    } catch (e) { showToast('Discussions: ' + e.message) }
    setPosting(false)
  }

  async function submitReply() {
    if ((!replyBody.trim() && !replyImage) || sending) return
    setSending(true)
    try {
      await api('POST', '/auth/posts', { roomId: currentRoomId, parentId: openId, body: replyBody, image: replyImage })
      setReplyBody('')
      setReplyImage('')
      await loadPosts(true)
    } catch (e) { showToast('Discussions: ' + e.message) }
    setSending(false)
  }

  async function deletePost(id) {
    if (!(await askConfirm({ title: 'Supprimer ce message', message: 'Le message et toutes ses réponses seront supprimés.', confirmLabel: 'Supprimer', danger: true }))) return
    try {
      await api('DELETE', '/auth/posts', { id, roomId: currentRoomId })
      setPosts(prev => prev.filter(p => p.id !== id && p.parent_id !== id))
      if (id === openId) setOpenId(null)
    } catch (e) { showToast('Discussions: ' + e.message) }
  }

  // ════════ SUJET OUVERT : page de conversation ════════
  if (openPost) {
    const item = openPost.item_id ? itemOf(openPost.item_id) : null
    const custom = avatarOf(openPost)
    return (
      <div className="thread-page anim-up">
        <button className="thread-back" onClick={() => setOpenId(null)}>← Toutes les discussions</button>

        <article className="card thread-original">
          <div className="post-head">
            <Avatar pseudo={openPost.pseudo} emoji={custom.emoji || ''} hue={custom.hue ?? null} url={custom.url || ''} size={40} />
            <div className="post-head-info">
              <b>{openPost.pseudo}<UserTag entry={custom} /></b>
              <small>{formatRelative(openPost.created_at)}</small>
            </div>
            {item && <span className="chip post-film-chip">{(TYPE_META[item.type] || TYPE_META.film).icon} {item.title}</span>}
            {canDelete(openPost) && (
              <button className="btn-icon danger post-delete" onClick={() => deletePost(openPost.id)} title="Supprimer le sujet">✕</button>
            )}
          </div>
          {openPost.title && <h2 className="post-title">{openPost.title}</h2>}
          {renderContent(openPost, true)}
        </article>

        <div className="thread-messages">
          {openReplies.length === 0 && (
            <div className="thread-empty">Personne n'a encore répondu — lancez le débat !</div>
          )}
          {openReplies.map(reply => {
            const rc = avatarOf(reply)
            return (
              <div className="thread-msg" key={reply.id}>
                <Avatar pseudo={reply.pseudo} emoji={rc.emoji || ''} hue={rc.hue ?? null} url={rc.url || ''} size={30} />
                <div className="thread-msg-body">
                  <div className="thread-msg-meta">
                    <b>{reply.pseudo}</b><UserTag entry={rc} />
                    <small>{formatRelative(reply.created_at)}</small>
                    {canDelete(reply) && (
                      <button className="post-reply-delete" onClick={() => deletePost(reply.id)}>✕</button>
                    )}
                  </div>
                  {renderContent(reply)}
                </div>
              </div>
            )
          })}
          <div ref={threadEndRef} />
        </div>

        {replyImage && (
          <div className="thread-attach-preview">
            <img src={replyImage} alt="pièce jointe" />
            <button onClick={() => setReplyImage('')} aria-label="Retirer">×</button>
          </div>
        )}
        <div className="thread-compose">
          <button className="attach-btn" onClick={() => fileRef.current?.click()} title="Joindre une image ou un GIF">📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAttach} />
          <input
            className="admin-input"
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Répondre... (collez un lien GIF Tenor pour l'intégrer)"
            maxLength={3000}
            onKeyDown={e => e.key === 'Enter' && submitReply()}
          />
          <button className="btn-add" style={{ width: 'auto', padding: '11px 20px' }} onClick={submitReply} disabled={sending}>➤</button>
        </div>
      </div>
    )
  }

  // ════════ HUB des discussions ════════
  return (
    <>
      <div className="view-head anim-up">
        <h1>Discussions</h1>
        <p>Débattez des films de la room {currentRoom.name} — théories, scènes cultes, avis à chaud</p>
      </div>

      <div className="card anim-up-1" style={{ marginBottom: '22px' }}>
        <h2>Nouveau sujet</h2>
        <div className="post-compose">
          <div className="post-compose-row">
            <input className="admin-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Titre du sujet — ex: La scène de la 3e minute 👀" maxLength={140} />
            <select className="admin-select post-film-select" value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">Sans film lié</option>
              {watchlist.map(item => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          <textarea className="admin-input" style={{ minHeight: '70px', resize: 'vertical' }}
            value={body} onChange={e => setBody(e.target.value)} maxLength={3000}
            placeholder="Lancez le débat..." />
          <div className="post-compose-foot">
            <span>{body.length}/3000</span>
            <button className="btn-add" style={{ width: 'auto', padding: '10px 24px' }} onClick={submitPost} disabled={posting}>
              {posting ? 'Publication...' : 'Créer le sujet'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Chargement des discussions...</p></div>
      ) : roots.length === 0 ? (
        <div className="empty-state">
          <div className="icon">💬</div>
          <p>Aucune discussion pour le moment.<br />Créez le premier sujet !</p>
        </div>
      ) : (
        <div className="posts-list">
          {roots.map(post => {
            const item = post.item_id ? itemOf(post.item_id) : null
            const replies = repliesByParent[post.id] || []
            const custom = avatarOf(post)
            const last = replies.length ? replies[replies.length - 1] : post
            return (
              <button className="card disc-topic anim-up-2" key={post.id} onClick={() => setOpenId(post.id)}>
                <Avatar pseudo={post.pseudo} emoji={custom.emoji || ''} hue={custom.hue ?? null} url={custom.url || ''} size={38} />
                <div className="disc-topic-body">
                  <div className="disc-topic-title">
                    {post.title || post.body.slice(0, 80) || '(image)'}
                  </div>
                  <div className="disc-topic-meta">
                    {post.pseudo} · {replies.length} réponse{replies.length > 1 ? 's' : ''} · dernier message {formatRelative(last.created_at)}
                    {item && <> · {(TYPE_META[item.type] || TYPE_META.film).icon} {item.title}</>}
                  </div>
                </div>
                <span className="disc-topic-count">{replies.length} 💬</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Règles + fonctionnalités, première visite uniquement */}
      {rulesOpen && (
        <Modal onClose={closeRules}>
          <div className="modal-body patch-box">
            <span className="kicker">Bienvenue dans les Discussions</span>
            <h2>Le coin débats de la room 💬</h2>
            <p>Ce que vous pouvez faire ici :</p>
            <ul>
              <li>Créer des sujets — liés à un film ou libres.</li>
              <li>Répondre dans des fils de conversation dédiés.</li>
              <li>Envoyer des images (📷, compressées automatiquement) et des GIF (collez un lien Tenor).</li>
            </ul>
            <p>Les règles de la maison :</p>
            <ul>
              <li>Respect entre membres — on débat des films, pas des gens.</li>
              <li>Spoilers : prévenez dans le titre du sujet ! 🚨</li>
              <li>Chacun peut supprimer ses propres messages.</li>
            </ul>
            <button onClick={closeRules}>Compris, à moi le débat !</button>
          </div>
        </Modal>
      )}
    </>
  )
}

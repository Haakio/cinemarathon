import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Avatar from '../widgets/Avatar'
import { AVATAR_EMOJIS, AVATAR_HUES } from '../../utils/constants'
import { buildBadgeContext, computeBadges } from '../../lib/badges'
import { formatDate, formatRelative, pseudoHue } from '../../utils/format'
import { patchnoteHistory } from '../../lib/patchnotes'

/** Lit un fichier en data URL (pour les GIF, conservés tels quels). */
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Redimensionne une image en carré (cover) côté navigateur.
 * Résultat : data URL webp ~10-15 Ko, stockable en base sans service externe.
 */
function downscaleImage(file, size = 128) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/webp', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image illisible')) }
    img.src = objectUrl
  })
}

/**
 * Espace personnel : Profil (avatar + badges), Amis (recherche/demandes),
 * Notifications (patchnotes + demandes reçues), Paramètres.
 * Remplace l'ancien dropdown paramètres ET le popup patchnotes.
 */
export default function ProfileModal({
  social, currentUser, onClose, initialTab = 'profil', voteNotice = null,
  onAcceptRoomInvite, onDeclineRoomInvite,
  watchlist, watched, availability, chatMessages,
  chatEnabled, onChatPreference, onLogout,
}) {
  const [tab, setTab] = useState(initialTab)
  const { profile, friends, incoming, outgoing } = social

  // Avatar en cours d'édition (appliqué au clic sur Enregistrer)
  const [draftEmoji, setDraftEmoji] = useState(profile?.avatarEmoji || '')
  const [draftHue, setDraftHue] = useState(profile?.avatarHue ?? null)
  const [draftUrl, setDraftUrl] = useState(profile?.avatarUrl || '')
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    setDraftEmoji(profile?.avatarEmoji || '')
    setDraftHue(profile?.avatarHue ?? null)
    setDraftUrl(profile?.avatarUrl || '')
  }, [profile])

  // Recherche d'amis
  const [friendQuery, setFriendQuery] = useState('')
  const [friendResults, setFriendResults] = useState([])
  const [friendMsg, setFriendMsg] = useState('')

  useEffect(() => {
    const q = friendQuery.trim()
    if (q.length < 2) { setFriendResults([]); return }
    const timer = setTimeout(async () => {
      setFriendResults(await social.searchMembers(q))
    }, 350)
    return () => clearTimeout(timer)
  }, [friendQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ouverture de l'onglet notifications = tout marquer lu
  useEffect(() => {
    if (tab === 'notifications') social.markNotificationsSeen()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const badges = useMemo(() => computeBadges(buildBadgeContext({
    userId: currentUser?.id,
    pseudo: currentUser?.pseudo,
    watchlist, watched, availability, chatMessages,
  })), [currentUser, watchlist, watched, availability, chatMessages])

  const mySeen = useMemo(() => {
    const mine = watched.filter(w => w.user_id === currentUser?.id)
    return new Set(mine.map(w => w.item_id)).size
  }, [watched, currentUser])

  const friendIds = useMemo(() => new Set([...friends, ...outgoing].map(f => f.userId)), [friends, outgoing])

  async function saveAvatar() {
    setSaving(true)
    const ok = await social.updateAvatar(draftEmoji, draftHue, draftUrl.trim())
    setSaving(false)
    if (ok) setFriendMsg('')
  }

  async function requestFriend(pseudo) {
    const result = await social.sendFriendRequest(pseudo)
    if (result === 'accepted') setFriendMsg(`Vous êtes maintenant ami avec ${pseudo} !`)
    if (result === 'sent') setFriendMsg(`Demande envoyée à ${pseudo}.`)
    setFriendQuery('')
    setFriendResults([])
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-choisir le même fichier
    if (!file) return
    setUploadError('')
    if (!file.type.startsWith('image/')) {
      setUploadError('Choisissez un fichier image.')
      return
    }
    // GIF : conservé tel quel pour garder l'animation (donc limité en taille)
    if (file.type === 'image/gif') {
      if (file.size > 150 * 1024) {
        setUploadError('GIF trop lourd (max 150 Ko). Astuce : collez plutôt un lien Tenor dans le champ URL.')
        return
      }
      setDraftUrl(await readAsDataURL(file))
      return
    }
    try {
      const dataUrl = await downscaleImage(file, 128)
      if (dataUrl.length > 200000) {
        setUploadError('Image trop lourde après compression, essayez-en une autre.')
        return
      }
      setDraftUrl(dataUrl)
    } catch {
      setUploadError('Impossible de lire cette image.')
    }
  }

  const isDataUrl = draftUrl.trim().startsWith('data:')
  const avatarDirty = draftEmoji !== (profile?.avatarEmoji || '')
    || (draftHue ?? null) !== (profile?.avatarHue ?? null)
    || draftUrl.trim() !== (profile?.avatarUrl || '')
  const urlValid = !draftUrl.trim() || /^https:\/\//i.test(draftUrl.trim()) || draftUrl.trim().startsWith('data:image/')

  const TABS = [
    ['profil', 'Profil'],
    ['amis', `Amis${incoming.length ? ` (${incoming.length})` : ''}`],
    ['notifications', 'Notifications'],
    ['parametres', 'Paramètres'],
  ]

  return (
    <Modal onClose={onClose} className="profile-modal">
      <div className="modal-body">
        {/* En-tête identité */}
        <div className="profile-head">
          <Avatar pseudo={currentUser?.pseudo} emoji={draftEmoji} hue={draftHue} url={draftUrl.trim()} size={64} />
          <div>
            <h2 className="display" style={{ fontSize: '24px' }}>{currentUser?.pseudo}</h2>
            <div className="profile-sub">
              {profile?.createdAt ? `Membre depuis le ${formatDate(profile.createdAt)} · ` : ''}
              {mySeen} titre{mySeen > 1 ? 's' : ''} vu{mySeen > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
              {id === 'notifications' && social.unreadCount > 0 && tab !== 'notifications' && (
                <span className="notif-dot">{social.unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── PROFIL ── */}
        {tab === 'profil' && (
          <div>
            <h4 className="profile-section-title">Photo ou GIF</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn-add" style={{ width: 'auto', padding: '11px 20px' }} onClick={() => fileInputRef.current?.click()}>
                📁 Importer depuis mon appareil
              </button>
              {draftUrl.trim() && (
                <button className="friend-decline" onClick={() => { setDraftUrl(''); setUploadError('') }}>
                  Retirer l'image
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFile}
              />
            </div>
            {!isDataUrl && (
              <input
                className="admin-input"
                style={{ marginTop: '10px' }}
                value={draftUrl}
                onChange={e => setDraftUrl(e.target.value)}
                placeholder="...ou collez un lien https:// (Imgur, Tenor, Discord)"
                maxLength={500}
              />
            )}
            <div className="tmdb-hint">
              Les images sont compressées automatiquement. GIF animés acceptés jusqu'à 150 Ko
              (au-delà, collez un lien Tenor). Si l'image disparaît un jour, l'emoji reprend le relais.
              {!urlValid && <span style={{ color: 'var(--red)' }}> L'URL doit commencer par https://</span>}
              {uploadError && <span style={{ color: 'var(--red)' }}> {uploadError}</span>}
            </div>

            <h4 className="profile-section-title">Emoji (si pas d'image)</h4>
            <div className="avatar-picker">
              <button className={`avatar-choice ${draftEmoji === '' ? 'selected' : ''}`} onClick={() => setDraftEmoji('')}>
                {(currentUser?.pseudo || '?')[0].toUpperCase()}
              </button>
              {AVATAR_EMOJIS.map(emoji => (
                <button key={emoji} className={`avatar-choice ${draftEmoji === emoji ? 'selected' : ''}`} onClick={() => setDraftEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
            <h4 className="profile-section-title">Couleur</h4>
            <div className="hue-picker">
              <button
                className={`hue-choice ${draftHue === null ? 'selected' : ''}`}
                style={{ background: `hsl(${pseudoHue(currentUser?.pseudo)}, 48%, 50%)` }}
                onClick={() => setDraftHue(null)}
                title="Couleur automatique"
              >A</button>
              {AVATAR_HUES.map(hue => (
                <button
                  key={hue}
                  className={`hue-choice ${draftHue === hue ? 'selected' : ''}`}
                  style={{ background: `hsl(${hue}, 48%, 50%)` }}
                  onClick={() => setDraftHue(hue)}
                />
              ))}
            </div>
            {avatarDirty && (
              <button className="btn-add" style={{ marginTop: '14px' }} onClick={saveAvatar} disabled={saving || !urlValid}>
                {saving ? 'Enregistrement...' : 'Enregistrer mon avatar'}
              </button>
            )}

            <h4 className="profile-section-title" style={{ marginTop: '22px' }}>
              Badges ({badges.filter(b => b.unlocked).length}/{badges.length})
            </h4>
            <div className="badges-grid">
              {badges.map(badge => (
                <div className={`badge-tile ${badge.unlocked ? 'unlocked' : 'locked'}`} key={badge.id}>
                  <div className="badge-icon">{badge.icon}</div>
                  <b>{badge.name}</b>
                  <span>{badge.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AMIS ── */}
        {tab === 'amis' && (
          <div>
            <h4 className="profile-section-title">Ajouter un ami</h4>
            <div className="tmdb-search">
              <input className="admin-input" value={friendQuery} onChange={e => setFriendQuery(e.target.value)}
                placeholder="Rechercher un pseudo..." />
              {friendResults.length > 0 && (
                <div className="tmdb-results">
                  {friendResults.map(result => (
                    <button key={result.id} className="tmdb-result" onClick={() => requestFriend(result.pseudo)}
                      disabled={friendIds.has(result.id)}>
                      <Avatar pseudo={result.pseudo} size={28} />
                      <span>
                        {result.pseudo}
                        <small>{friendIds.has(result.id) ? 'Déjà ami / demande en cours' : 'Envoyer une demande'}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {friendMsg && <div className="profile-msg">{friendMsg}</div>}

            {incoming.length > 0 && (
              <>
                <h4 className="profile-section-title">Demandes reçues ({incoming.length})</h4>
                {incoming.map(request => (
                  <div className="friend-row" key={request.userId}>
                    <Avatar pseudo={request.pseudo} emoji={request.avatarEmoji} hue={request.avatarHue} url={request.avatarUrl} size={34} />
                    <div className="friend-name">{request.pseudo}</div>
                    <div className="friend-actions">
                      <button className="friend-accept" onClick={() => social.acceptFriend(request.userId)}>Accepter</button>
                      <button className="friend-decline" onClick={() => social.declineFriend(request.userId)}>Refuser</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {outgoing.length > 0 && (
              <>
                <h4 className="profile-section-title">Demandes envoyées</h4>
                {outgoing.map(request => (
                  <div className="friend-row" key={request.userId}>
                    <Avatar pseudo={request.pseudo} emoji={request.avatarEmoji} hue={request.avatarHue} url={request.avatarUrl} size={34} />
                    <div className="friend-name">{request.pseudo} <small style={{ color: 'var(--text3)' }}>en attente</small></div>
                    <div className="friend-actions">
                      <button className="friend-decline" onClick={() => social.declineFriend(request.userId)}>Annuler</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <h4 className="profile-section-title">Mes amis ({friends.length})</h4>
            {friends.length === 0 ? (
              <p className="profile-empty">Pas encore d'ami. Recherchez un pseudo ci-dessus !</p>
            ) : friends.map(friend => (
              <div className="friend-row" key={friend.userId}>
                <Avatar pseudo={friend.pseudo} emoji={friend.avatarEmoji} hue={friend.avatarHue} url={friend.avatarUrl} size={34} />
                <div className="friend-name">{friend.pseudo}</div>
                <div className="friend-actions">
                  <button className="friend-decline" onClick={() => social.removeFriend(friend.userId)}>Retirer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 'notifications' && (
          <div>
            {social.roomInvites?.length > 0 && (
              <>
                <h4 className="profile-section-title">Invitations de room</h4>
                {social.roomInvites.map(invite => (
                  <div className="friend-row" key={invite.roomId}>
                    <span style={{ fontSize: '20px' }}>🎬</span>
                    <div className="friend-name">
                      <b>{invite.fromPseudo}</b> vous invite dans <b>{invite.roomName}</b>
                      <small style={{ display: 'block', color: 'var(--text3)' }}>{formatRelative(invite.since)}</small>
                    </div>
                    <div className="friend-actions">
                      <button className="friend-accept" onClick={() => onAcceptRoomInvite?.(invite)}>Rejoindre</button>
                      <button className="friend-decline" onClick={() => onDeclineRoomInvite?.(invite)}>Refuser</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {voteNotice && (
              <>
                <h4 className="profile-section-title">Vote de séance</h4>
                <div className="friend-row">
                  <span style={{ fontSize: '20px' }}>🗳️</span>
                  <div className="friend-name">
                    {voteNotice.myBallot
                      ? 'Un vote est en cours — vous avez déjà voté.'
                      : 'Un vote est en cours : choisissez le prochain film !'}
                    <small style={{ display: 'block', color: 'var(--text3)' }}>
                      Fin : {formatDate(voteNotice.endsAt)} à {new Date(voteNotice.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                  <div className="friend-actions">
                    <button className="friend-accept" onClick={voteNotice.onGo}>
                      {voteNotice.myBallot ? 'Voir' : 'Voter'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {incoming.length > 0 && (
              <>
                <h4 className="profile-section-title">Demandes d'amis</h4>
                {incoming.map(request => (
                  <div className="friend-row" key={request.userId}>
                    <Avatar pseudo={request.pseudo} emoji={request.avatarEmoji} hue={request.avatarHue} url={request.avatarUrl} size={34} />
                    <div className="friend-name"><b>{request.pseudo}</b> veut devenir votre ami · <small>{formatRelative(request.since)}</small></div>
                    <div className="friend-actions">
                      <button className="friend-accept" onClick={() => social.acceptFriend(request.userId)}>Accepter</button>
                      <button className="friend-decline" onClick={() => social.declineFriend(request.userId)}>Refuser</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <h4 className="profile-section-title">Nouveautés du site</h4>
            {patchnoteHistory.map(entry => (
              <div className="notif-entry" key={entry.version}>
                <div className="notif-entry-head">
                  <b>{entry.title}</b>
                  <small>{formatDate(entry.date)}</small>
                </div>
                <p>{entry.intro}</p>
                <ul>
                  {entry.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* ── PARAMÈTRES ── */}
        {tab === 'parametres' && (
          <div>
            <label className="settings-row">
              <span>
                <strong>Chat</strong>
                <small>Bulle de discussion par room</small>
              </span>
              <input type="checkbox" checked={chatEnabled} onChange={e => onChatPreference(e.target.checked)} />
            </label>
            <button className="btn-ghost" style={{ marginTop: '14px' }} onClick={onLogout}>
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

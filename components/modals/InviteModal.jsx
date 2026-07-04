import { useEffect, useState } from 'react'
import Modal from './Modal'
import Avatar from '../widgets/Avatar'
import { api } from '../../utils/api'

/**
 * Inviter dans la room : lien d'invitation à partager (token stable,
 * rejoignable sans code) + invitation directe des amis du site
 * (ils reçoivent une notification Accepter/Refuser).
 */
export default function InviteModal({ currentRoom, currentRoomId, friends, showToast, onClose }) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [sentTo, setSentTo] = useState([]) // userIds déjà invités pendant cette session
  const [sendingTo, setSendingTo] = useState(null)

  // Récupère (ou génère) le lien à l'ouverture
  useEffect(() => {
    let cancelled = false
    api('POST', '/auth/rooms', { action: 'inviteLink', roomId: currentRoomId })
      .then(data => {
        if (!cancelled) setInviteUrl(`${window.location.origin}/?invite=${data.token}`)
      })
      .catch(e => { if (!cancelled) setLinkError(e.message) })
    return () => { cancelled = true }
  }, [currentRoomId])

  function copyLink() {
    if (!inviteUrl) return
    navigator.clipboard?.writeText(inviteUrl)
      .then(() => showToast('Lien copié ✓'))
      .catch(() => showToast('Copie impossible — sélectionnez le lien manuellement.'))
  }

  async function inviteFriend(friend) {
    setSendingTo(friend.userId)
    try {
      await api('POST', '/auth/rooms', { action: 'inviteFriend', roomId: currentRoomId, targetUserId: friend.userId })
      setSentTo(prev => [...prev, friend.userId])
      showToast(`Invitation envoyée à ${friend.pseudo} ✓`)
    } catch (e) {
      showToast(e.message)
    }
    setSendingTo(null)
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <span className="kicker">Invitation</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 18px' }}>
          Inviter dans {currentRoom.name}
        </h2>

        <h4 className="profile-section-title">Lien d'invitation</h4>
        {linkError ? (
          <p className="profile-empty">{linkError}</p>
        ) : (
          <div className="invite-link-row">
            <input readOnly value={inviteUrl || 'Génération du lien...'} onFocus={e => e.target.select()} />
            <button onClick={copyLink} disabled={!inviteUrl}>Copier</button>
          </div>
        )}
        <div className="tmdb-hint">
          Toute personne avec ce lien rejoint la room directement (compte requis, pas de code).
          Partagez-le sur Discord, WhatsApp...
        </div>

        <h4 className="profile-section-title">Inviter mes amis</h4>
        {friends.length === 0 ? (
          <p className="profile-empty">
            Pas encore d'amis sur le site — ajoutez-en depuis votre profil, ou partagez le lien ci-dessus.
          </p>
        ) : friends.map(friend => (
          <div className="friend-row" key={friend.userId}>
            <Avatar pseudo={friend.pseudo} emoji={friend.avatarEmoji} hue={friend.avatarHue} url={friend.avatarUrl} size={34} />
            <div className="friend-name">{friend.pseudo}</div>
            <div className="friend-actions">
              {sentTo.includes(friend.userId) ? (
                <span className="chip" style={{ color: 'var(--green)' }}>Invité ✓</span>
              ) : (
                <button className="friend-accept" onClick={() => inviteFriend(friend)} disabled={sendingTo === friend.userId}>
                  {sendingTo === friend.userId ? '...' : 'Inviter'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import Modal from './Modal'
import Avatar from '../widgets/Avatar'
import Icon from '../widgets/Icon'
import AppealChat from '../widgets/AppealChat'
import { api } from '../../utils/api'

/**
 * Panel Modération — RÉSERVÉ À L'ADMIN DU SITE (bouton à côté du profil).
 * Regroupe : nomination des modérateurs (épée verte), réinitialisation de
 * mot de passe et suppression de compte (migrés depuis l'Administration),
 * et l'accès rapide au pupitre de Bannissement.
 */
export default function AdminPanelModal({ social, showToast, askConfirm, onGoModeration, onClose }) {
  // ── Conversation avec un compte suspendu ────────────────
  const [chatWith, setChatWith] = useState(null) // { userId, pseudo }

  // ── Modérateurs ─────────────────────────────────────────
  const [modPseudo, setModPseudo] = useState('')
  const [modSaving, setModSaving] = useState(false)

  // Liste des modos actuels, dérivée de l'avatarMap (dédupliquée par userId)
  const moderators = useMemo(() => {
    const seen = new Set()
    return Object.values(social.avatarMap)
      .filter(entry => entry.moderator && entry.userId && !seen.has(entry.userId) && seen.add(entry.userId))
  }, [social.avatarMap])

  async function setModerator(pseudo, makeMod) {
    if (!pseudo?.trim()) { showToast('Entrez un pseudo.'); return }
    setModSaving(true)
    try {
      await api('POST', '/auth/moderation', { action: makeMod ? 'mod' : 'unmod', pseudo: pseudo.trim() })
      showToast(makeMod ? `⚔️ ${pseudo.trim()} est maintenant modérateur !` : 'Épée retirée.')
      setModPseudo('')
      social.reload()
    } catch (e) { showToast(e.message) }
    setModSaving(false)
  }

  // ── Mot de passe oublié ─────────────────────────────────
  const [resetPseudo, setResetPseudo] = useState('')
  const [resetResult, setResetResult] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)

  async function generateResetCode() {
    if (!resetPseudo.trim()) { showToast('Entrez le pseudo du membre.'); return }
    setResetLoading(true)
    setResetResult(null)
    try {
      const data = await api('POST', '/auth/reset-code', { pseudo: resetPseudo.trim() })
      setResetResult(data)
      setResetPseudo('')
    } catch (e) { showToast('Réinit: ' + e.message) }
    setResetLoading(false)
  }

  function copyResetCode() {
    if (!resetResult?.code) return
    navigator.clipboard?.writeText(resetResult.code)
      .then(() => showToast('Code copié ✓'))
      .catch(() => showToast('Copie impossible, notez le code manuellement.'))
  }

  // ── Suppression de compte ───────────────────────────────
  const [deletePseudo, setDeletePseudo] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function deleteAccount() {
    const pseudo = deletePseudo.trim()
    if (!pseudo) { showToast('Entrez le pseudo du compte.'); return }
    if (deleteConfirm !== pseudo) { showToast('Retapez le pseudo exact dans la confirmation.'); return }
    if (!(await askConfirm({ title: `Supprimer le compte ${pseudo}`, message: 'SUPPRESSION DÉFINITIVE : le compte, ses notes, messages, amitiés, votes, posts et ses rooms privées. Aucun retour en arrière possible.', confirmLabel: 'Supprimer définitivement', danger: true }))) return
    setDeleteLoading(true)
    try {
      await api('POST', '/auth/delete-account', { pseudo, confirm: deleteConfirm })
      setDeletePseudo('')
      setDeleteConfirm('')
      showToast(`Compte "${pseudo}" supprimé.`)
    } catch (e) { showToast(e.message) }
    setDeleteLoading(false)
  }

  // ── Vue conversation (plein modal) ──────────────────────
  if (chatWith) {
    return (
      <Modal onClose={onClose} className="admin-panel">
        <div className="modal-body">
          <button className="thread-back" onClick={() => setChatWith(null)}>← Panel Modération</button>
          <h2 className="display" style={{ fontSize: '22px', margin: '10px 0 4px' }}>
            💬 Conversation avec {chatWith.pseudo}
          </h2>
          <p className="tmdb-hint" style={{ marginTop: 0, marginBottom: '12px' }}>
            Canal d'appel privé — lui seul et vous pouvez le lire.
          </p>
          <AppealChat targetUserId={chatWith.userId} placeholder={`Répondre à ${chatWith.pseudo}...`} />
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} className="admin-panel">
      <div className="modal-body">
        <span className="kicker">Admin du site</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 18px' }}>Panel Modération</h2>

        {social.modCases.length > 0 && (
          <>
            <h4 className="profile-section-title">💬 Discuter avec les comptes suspendus</h4>
            {social.modCases.map(modCase => (
              <div className="friend-row" key={modCase.userId}>
                <span style={{ fontSize: '17px' }}>{modCase.banned ? '🚫' : '⛔'}</span>
                <div className="friend-name">
                  <b>{modCase.pseudo}</b>
                  <small style={{ display: 'block', color: 'var(--text3)' }}>
                    {modCase.banned ? 'Banni' : 'Bloqué'} — « {modCase.term} »
                  </small>
                </div>
                <div className="friend-actions">
                  <button className="friend-accept" onClick={() => setChatWith({ userId: modCase.userId, pseudo: modCase.pseudo })}>
                    Discuter
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        <button className="btn-ghost" style={{ marginTop: 0, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }} onClick={onGoModeration}>
          <Icon name="shield" size={15} />
          Ouvrir le pupitre de Bannissement
          {social.pendingModCount > 0 && <span className="notif-dot">{social.pendingModCount}</span>}
        </button>

        <h4 className="profile-section-title">⚔️ Modérateurs du site</h4>
        <p className="tmdb-hint" style={{ marginTop: 0, marginBottom: '10px' }}>
          Épée verte à côté du pseudo. Pouvoirs : supprimer n'importe quel message de discussion et n'importe quel avis.
        </p>
        <div className="room-code-row">
          <input value={modPseudo} onChange={e => setModPseudo(e.target.value)}
            placeholder="Pseudo à nommer" onKeyDown={e => e.key === 'Enter' && setModerator(modPseudo, true)} />
          <button onClick={() => setModerator(modPseudo, true)} disabled={modSaving}>Nommer</button>
        </div>
        {moderators.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            {moderators.map(mod => (
              <div className="friend-row" key={mod.userId}>
                <Avatar pseudo={mod.pseudo} emoji={mod.emoji || ''} hue={mod.hue ?? null} url={mod.url || ''} size={30} />
                <div className="friend-name">
                  {mod.pseudo} <span className="mod-sword"><Icon name="sword" size={12} strokeWidth={2.2} /></span>
                </div>
                <div className="friend-actions">
                  <button className="friend-decline" onClick={() => setModerator(mod.pseudo, false)}>Retirer l'épée</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h4 className="profile-section-title">🔑 Mot de passe oublié</h4>
        <div className="room-code-row">
          <input value={resetPseudo} onChange={e => setResetPseudo(e.target.value)}
            placeholder="Pseudo du membre" onKeyDown={e => e.key === 'Enter' && generateResetCode()} />
          <button onClick={generateResetCode} disabled={resetLoading}>{resetLoading ? '...' : 'Générer'}</button>
        </div>
        {resetResult && (
          <>
            <div className="reset-code-display">
              <b>{resetResult.code}</b>
              <button onClick={copyResetCode}>Copier</button>
            </div>
            <div className="tmdb-hint">
              Code pour <strong>{resetResult.pseudo}</strong> — affiché une seule fois, expire dans {resetResult.expiresInMinutes} min.
            </div>
          </>
        )}

        <h4 className="profile-section-title" style={{ color: 'var(--red)' }}>⚠️ Supprimer un compte</h4>
        <div className="admin-form-group">
          <input className="admin-input" value={deletePseudo} onChange={e => setDeletePseudo(e.target.value)}
            placeholder="Pseudo à supprimer" />
        </div>
        <div className="admin-form-group">
          <input className="admin-input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="Confirmation — retapez le pseudo exact" />
        </div>
        <button
          className="btn-danger"
          onClick={deleteAccount}
          disabled={deleteLoading || !deletePseudo.trim() || deleteConfirm !== deletePseudo.trim()}
        >
          {deleteLoading ? 'Suppression...' : 'Supprimer définitivement ce compte'}
        </button>
      </div>
    </Modal>
  )
}

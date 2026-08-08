import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Icon from '../widgets/Icon'
import AppealChat from '../widgets/AppealChat'
import { api } from '../../utils/api'
import { formatDate, formatRelative } from '../../utils/format'

/**
 * Panel Modération — style "panel admin de serveur" (txAdmin / FiveM) :
 * bandeau de stats, navigation par onglets, liste de membres cherchable,
 * et un clic sur un membre ouvre son panneau d'actions.
 *
 * Les modérateurs (épée verte) n'ont accès qu'à l'onglet Modération ;
 * la liste des membres et les outils de compte restent réservés à l'admin
 * du site. Aucun contenu privé (messages, avis, rooms) n'est exposé ici —
 * uniquement des métadonnées d'activité, conformément à la politique de
 * confidentialité.
 */

/** En ligne = vu il y a moins de 5 minutes (même seuil que la présence du site). */
const ONLINE_MS = 5 * 60 * 1000

export default function AdminPanelModal({ social, isAdmin = false, showToast, askConfirm, onGoModeration, onClose }) {
  const [tab, setTab] = useState(isAdmin ? 'membres' : 'moderation')
  const [chatWith, setChatWith] = useState(null) // { userId, pseudo }

  // ── Membres : métadonnées d'activité (admin uniquement) ──
  const [activity, setActivity] = useState(null)
  const [activityError, setActivityError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  async function loadActivity() {
    try {
      setActivity(await api('GET', '/auth/admin-users'))
      setActivityError('')
    } catch (e) { setActivityError(e.message) }
  }

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    api('GET', '/auth/admin-users')
      .then(rows => { if (!cancelled) setActivity(rows) })
      .catch(e => { if (!cancelled) setActivityError(e.message) })
    return () => { cancelled = true }
  }, [isAdmin])

  const stats = useMemo(() => {
    if (!activity) return null
    const now = Date.now()
    const seenWithin = ms => activity.filter(u => u.last_seen_at && now - new Date(u.last_seen_at).getTime() < ms).length
    return {
      total: activity.length,
      online: seenWithin(ONLINE_MS),
      day: seenWithin(86400000),
      week: seenWithin(7 * 86400000),
    }
  }, [activity])

  const filtered = useMemo(() => {
    if (!activity) return []
    const q = search.trim().toLowerCase()
    return q ? activity.filter(u => u.pseudo.toLowerCase().includes(q)) : activity
  }, [activity, search])

  const selected = useMemo(
    () => (selectedId ? activity?.find(u => u.id === selectedId) || null : null),
    [selectedId, activity]
  )

  // ── Actions sur un membre ───────────────────────────────
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // Changer de membre remet le panneau d'actions à zéro (pas de code de
  // réinitialisation ni de confirmation qui traîne d'un membre à l'autre).
  useEffect(() => { setResetResult(null); setDeleteConfirm('') }, [selectedId])

  async function toggleModerator(pseudo, makeMod) {
    setBusy(true)
    try {
      await api('POST', '/auth/moderation', { action: makeMod ? 'mod' : 'unmod', pseudo })
      showToast(makeMod ? `⚔️ ${pseudo} est maintenant modérateur !` : 'Épée retirée.')
      social.reload()
      await loadActivity()
    } catch (e) { showToast(e.message) }
    setBusy(false)
  }

  async function generateResetCode(pseudo) {
    setBusy(true)
    setResetResult(null)
    try {
      setResetResult(await api('POST', '/auth/reset-code', { pseudo }))
    } catch (e) { showToast('Réinit: ' + e.message) }
    setBusy(false)
  }

  function copyResetCode() {
    if (!resetResult?.code) return
    navigator.clipboard?.writeText(resetResult.code)
      .then(() => showToast('Code copié ✓'))
      .catch(() => showToast('Copie impossible, notez le code manuellement.'))
  }

  async function deleteAccount(pseudo) {
    if (deleteConfirm !== pseudo) { showToast('Retapez le pseudo exact pour confirmer.'); return }
    if (!(await askConfirm({
      title: `Supprimer le compte ${pseudo}`,
      message: 'SUPPRESSION DÉFINITIVE : le compte, ses notes, messages, amitiés, votes, posts et ses rooms privées. Aucun retour en arrière possible.',
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    }))) return
    setBusy(true)
    try {
      await api('POST', '/auth/delete-account', { pseudo, confirm: deleteConfirm })
      showToast(`Compte "${pseudo}" supprimé.`)
      setSelectedId(null)
      setDeleteConfirm('')
      await loadActivity()
    } catch (e) { showToast(e.message) }
    setBusy(false)
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

  const tabs = [
    ...(isAdmin ? [['membres', 'Membres', 'users']] : []),
    ['moderation', 'Modération', 'shield'],
    ...(isAdmin ? [['staff', 'Staff', 'sword']] : []),
  ]

  return (
    <Modal onClose={onClose} className="admin-panel">
      <div className="adm">
        <div className="adm-head">
          <div>
            <span className="adm-kicker">{isAdmin ? 'Admin du site' : 'Modération'}</span>
            <h2 className="adm-title">Panel de contrôle</h2>
          </div>
          {stats && (
            <div className="adm-live">
              <span className="adm-dot online" />
              {stats.online} en ligne
            </div>
          )}
        </div>

        {stats && (
          <div className="adm-stats">
            <div className="adm-stat"><b>{stats.total}</b><small>comptes</small></div>
            <div className="adm-stat"><b>{stats.online}</b><small>en ligne</small></div>
            <div className="adm-stat"><b>{stats.day}</b><small>actifs 24 h</small></div>
            <div className="adm-stat"><b>{stats.week}</b><small>actifs 7 j</small></div>
          </div>
        )}

        <div className="adm-tabs">
          {tabs.map(([value, label, icon]) => (
            <button
              key={value}
              className={`adm-tab ${tab === value ? 'active' : ''}`}
              onClick={() => setTab(value)}
            >
              <Icon name={icon} size={14} />
              {label}
              {value === 'moderation' && social.pendingModCount > 0 && (
                <span className="adm-badge">{social.pendingModCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet MEMBRES ─────────────────────────────── */}
        {tab === 'membres' && isAdmin && (
          <div className="adm-body">
            {activityError && <p className="adm-hint">Erreur : {activityError}</p>}
            {!activity && !activityError && <p className="adm-hint">Chargement...</p>}

            {activity && (
              <>
                <div className="adm-search">
                  <Icon name="search" size={14} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Rechercher parmi ${activity.length} membres...`}
                  />
                </div>

                <div className="adm-list">
                  {filtered.length === 0 && <div className="adm-empty">Aucun membre ne correspond.</div>}
                  {filtered.map(entry => {
                    const online = entry.last_seen_at && Date.now() - new Date(entry.last_seen_at).getTime() < ONLINE_MS
                    return (
                      <button
                        key={entry.id}
                        className={`adm-row ${selectedId === entry.id ? 'active' : ''}`}
                        onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
                      >
                        <span className={`adm-dot ${online ? 'online' : ''}`} />
                        <span className="adm-row-name">
                          {entry.pseudo}
                          {entry.moderator && <span className="adm-tag mod"><Icon name="sword" size={10} strokeWidth={2.4} /></span>}
                          {entry.banned && <span className="adm-tag danger">BANNI</span>}
                          {!entry.banned && entry.blocked && <span className="adm-tag danger">BLOQUÉ</span>}
                        </span>
                        <span className="adm-row-meta">
                          {entry.last_seen_at ? formatRelative(entry.last_seen_at) : 'jamais vu'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {selected && (
                  <div className="adm-actions">
                    <div className="adm-actions-head">
                      <b>{selected.pseudo}</b>
                      <button className="adm-close" onClick={() => setSelectedId(null)} aria-label="Fermer">×</button>
                    </div>
                    <div className="adm-meta-grid">
                      <div><small>Inscrit le</small>{formatDate(selected.created_at)}</div>
                      <div><small>Dernière activité</small>{selected.last_seen_at ? formatRelative(selected.last_seen_at) : 'jamais'}</div>
                      <div><small>Rooms</small>{selected.room_count ?? '—'}</div>
                      <div><small>Statut</small>{selected.banned ? 'Banni' : selected.blocked ? 'Bloqué' : 'Actif'}</div>
                    </div>

                    <div className="adm-btn-row">
                      <button className="adm-btn" disabled={busy} onClick={() => generateResetCode(selected.pseudo)}>
                        <Icon name="gear" size={13} /> Code de réinitialisation
                      </button>
                      <button className="adm-btn" disabled={busy} onClick={() => toggleModerator(selected.pseudo, !selected.moderator)}>
                        <Icon name="sword" size={13} /> {selected.moderator ? "Retirer l'épée" : 'Nommer modérateur'}
                      </button>
                    </div>

                    {resetResult && (
                      <div className="adm-code">
                        <b>{resetResult.code}</b>
                        <button onClick={copyResetCode}>Copier</button>
                        <small>Pour {resetResult.pseudo} — affiché une seule fois, expire dans {resetResult.expiresInMinutes} min.</small>
                      </div>
                    )}

                    <div className="adm-danger">
                      <small>Zone dangereuse — suppression définitive du compte et de toutes ses données.</small>
                      <div className="adm-danger-row">
                        <input
                          value={deleteConfirm}
                          onChange={e => setDeleteConfirm(e.target.value)}
                          placeholder={`Retapez « ${selected.pseudo} »`}
                        />
                        <button
                          className="adm-btn danger"
                          disabled={busy || deleteConfirm !== selected.pseudo}
                          onClick={() => deleteAccount(selected.pseudo)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <p className="adm-hint">
                  Horodatage de dernière activité uniquement (déclaré dans la politique de
                  confidentialité). Aucun contenu privé — messages, avis, rooms — n'est accessible ici.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Onglet MODÉRATION ──────────────────────────── */}
        {tab === 'moderation' && (
          <div className="adm-body">
            <button className="adm-btn wide" onClick={onGoModeration}>
              <Icon name="shield" size={15} />
              Ouvrir le pupitre de Bannissement
              {social.pendingModCount > 0 && <span className="adm-badge">{social.pendingModCount}</span>}
            </button>

            {social.modCases.length > 0 ? (
              <>
                <div className="adm-section">Comptes suspendus — {social.modCases.length}</div>
                <div className="adm-list">
                  {social.modCases.map(modCase => (
                    <div className="adm-row static" key={modCase.userId}>
                      <span className="adm-dot danger" />
                      <span className="adm-row-name">
                        {modCase.pseudo}
                        <span className="adm-tag danger">{modCase.banned ? 'BANNI' : 'BLOQUÉ'}</span>
                        <small>« {modCase.term} »</small>
                      </span>
                      <button className="adm-btn mini" onClick={() => setChatWith({ userId: modCase.userId, pseudo: modCase.pseudo })}>
                        Discuter
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="adm-empty">Aucun compte suspendu — tout est calme. 🎬</div>
            )}

            {!isAdmin && (
              <p className="adm-hint">
                En tant que modérateur : discutez avec les comptes suspendus et débloquez les
                cas où le contexte est OK. Bannissements et outils de compte réservés à l'admin.
              </p>
            )}
          </div>
        )}

        {/* ── Onglet STAFF ───────────────────────────────── */}
        {tab === 'staff' && isAdmin && (
          <div className="adm-body">
            <p className="adm-hint" style={{ marginTop: 0 }}>
              Les modérateurs portent l'épée verte. Pouvoirs : supprimer n'importe quel
              message de discussion et n'importe quel avis. Nommez-les depuis l'onglet Membres.
            </p>
            {activity?.some(u => u.moderator) ? (
              <div className="adm-list">
                {activity.filter(u => u.moderator).map(mod => (
                  <div className="adm-row static" key={mod.id}>
                    <span className="adm-dot online" />
                    <span className="adm-row-name">
                      {mod.pseudo}
                      <span className="adm-tag mod"><Icon name="sword" size={10} strokeWidth={2.4} /></span>
                    </span>
                    <button className="adm-btn mini" disabled={busy} onClick={() => toggleModerator(mod.pseudo, false)}>
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adm-empty">Aucun modérateur nommé.</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

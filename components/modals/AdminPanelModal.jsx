import { useEffect, useMemo, useState } from 'react'
import Icon from '../widgets/Icon'
import AppealChat from '../widgets/AppealChat'
import { api } from '../../utils/api'
import { formatDate, formatRelative } from '../../utils/format'

/**
 * Panel de contrôle — surface PLEIN ÉCRAN façon panel de serveur de jeu :
 * rail d'icônes à gauche, cartes de stats, grille d'actions rapides, liste
 * de membres et panneau de détail. Volontairement plus "outil" et plus dense
 * que le reste du site, qui est éditorial.
 *
 * Les modérateurs (épée verte) n'accèdent qu'à la section Modération ; la
 * liste des membres et les outils de compte restent réservés à l'admin du
 * site. Aucun contenu privé (messages, avis, rooms) n'est exposé — seulement
 * des métadonnées d'activité, conformément à la politique de confidentialité.
 */

/** En ligne = vu il y a moins de 5 minutes. */
const ONLINE_MS = 5 * 60 * 1000

export default function AdminPanelModal({ social, isAdmin = false, showToast, askConfirm, onGoModeration, onClose }) {
  const [section, setSection] = useState(isAdmin ? 'membres' : 'moderation')
  const [chatWith, setChatWith] = useState(null)

  const [activity, setActivity] = useState(null)
  const [activityError, setActivityError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // Échap ferme le panel (comme les modals du site), sauf en conversation
  // où l'on revient d'abord à la liste.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      if (chatWith) setChatWith(null)
      else onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chatWith, onClose])

  // Le panel couvre tout l'écran : on gèle le défilement de la page dessous.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

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

  // Changer de membre remet le panneau d'actions à zéro (pas de code ni de
  // confirmation de suppression qui traîne d'un membre à l'autre).
  useEffect(() => { setResetResult(null); setDeleteConfirm('') }, [selectedId])

  const stats = useMemo(() => {
    if (!activity) return null
    const now = Date.now()
    const within = ms => activity.filter(u => u.last_seen_at && now - new Date(u.last_seen_at).getTime() < ms).length
    return {
      total: activity.length,
      online: within(ONLINE_MS),
      day: within(86400000),
      week: within(7 * 86400000),
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
      await loadActivity()
    } catch (e) { showToast(e.message) }
    setBusy(false)
  }

  const navItems = [
    ...(isAdmin ? [{ id: 'membres', icon: 'users', label: 'Membres' }] : []),
    { id: 'moderation', icon: 'shield', label: 'Modération', badge: social.pendingModCount },
    ...(isAdmin ? [{ id: 'staff', icon: 'sword', label: 'Staff' }] : []),
  ]

  const sectionLabel = navItems.find(item => item.id === section)?.label || 'Panel'

  return (
    <div className="apx">
      {/* Rail d'icônes */}
      <nav className="apx-rail">
        <div className="apx-rail-logo">C</div>
        <div className="apx-rail-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`apx-rail-btn ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
              title={item.label}
              aria-label={item.label}
            >
              <Icon name={item.icon} size={18} />
              {item.badge > 0 && <span className="apx-rail-badge">{item.badge}</span>}
              <span className="apx-rail-tip">{item.label}</span>
            </button>
          ))}
        </div>
        <button className="apx-rail-btn close" onClick={onClose} title="Fermer" aria-label="Fermer le panel">
          <Icon name="door" size={18} />
          <span className="apx-rail-tip">Fermer</span>
        </button>
      </nav>

      <div className="apx-main">
        {chatWith ? (
          <div className="apx-chat">
            <button className="apx-back" onClick={() => setChatWith(null)}>← Retour au panel</button>
            <h2 className="apx-h1">Conversation avec {chatWith.pseudo}</h2>
            <p className="apx-sub">Canal d'appel privé — lui seul et vous pouvez le lire.</p>
            <div className="apx-card" style={{ padding: '16px' }}>
              <AppealChat targetUserId={chatWith.userId} placeholder={`Répondre à ${chatWith.pseudo}...`} />
            </div>
          </div>
        ) : (
          <>
            <header className="apx-head">
              <div>
                <span className="apx-kicker">{isAdmin ? 'Admin du site' : 'Modération'} · {sectionLabel}</span>
                <h1 className="apx-h1">Panel de contrôle</h1>
              </div>
              {stats && (
                <div className="apx-live">
                  <span className="apx-dot online" />
                  <b>{stats.online}</b> en ligne
                </div>
              )}
            </header>

            {stats && (
              <div className="apx-stats">
                {[
                  { icon: 'users', value: stats.total, label: 'Comptes', tone: '' },
                  { icon: 'bell', value: stats.online, label: 'En ligne', tone: 'green' },
                  { icon: 'chart', value: stats.day, label: 'Actifs 24 h', tone: '' },
                  { icon: 'star', value: stats.week, label: 'Actifs 7 jours', tone: '' },
                ].map(card => (
                  <div className={`apx-card apx-stat ${card.tone}`} key={card.label}>
                    <span className="apx-stat-icon"><Icon name={card.icon} size={16} /></span>
                    <b>{card.value}</b>
                    <small>{card.label}</small>
                  </div>
                ))}
              </div>
            )}

            <div className="apx-section-title">Actions rapides</div>
            <div className="apx-tiles">
              <button className="apx-tile" onClick={onGoModeration}>
                <Icon name="shield" size={20} />
                Bannissements
                {social.pendingModCount > 0 && <span className="apx-tile-badge">{social.pendingModCount}</span>}
              </button>
              <button className="apx-tile" onClick={() => setSection('moderation')}>
                <Icon name="message" size={20} />
                Suspendus
                {social.modCases.length > 0 && <span className="apx-tile-badge">{social.modCases.length}</span>}
              </button>
              {isAdmin && (
                <button className="apx-tile" onClick={() => setSection('staff')}>
                  <Icon name="sword" size={20} />
                  Modérateurs
                </button>
              )}
              {isAdmin && (
                <button className="apx-tile" disabled={busy} onClick={loadActivity}>
                  <Icon name="gear" size={20} />
                  Actualiser
                </button>
              )}
            </div>

            {/* ── MEMBRES ────────────────────────────────── */}
            {section === 'membres' && isAdmin && (
              <div className="apx-split">
                <div className="apx-card apx-pane">
                  <div className="apx-pane-head">
                    <span>Membres{activity ? ` · ${filtered.length}` : ''}</span>
                    <div className="apx-search">
                      <Icon name="search" size={13} />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." />
                    </div>
                  </div>

                  {activityError && <div className="apx-empty">Erreur : {activityError}</div>}
                  {!activity && !activityError && <div className="apx-empty">Chargement...</div>}

                  {activity && (
                    <div className="apx-list">
                      {filtered.length === 0 && <div className="apx-empty">Aucun membre ne correspond.</div>}
                      {filtered.map(entry => {
                        const online = entry.last_seen_at && Date.now() - new Date(entry.last_seen_at).getTime() < ONLINE_MS
                        return (
                          <button
                            key={entry.id}
                            className={`apx-row ${selectedId === entry.id ? 'active' : ''}`}
                            onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
                          >
                            <span className={`apx-dot ${online ? 'online' : ''}`} />
                            <span className="apx-row-name">
                              {entry.pseudo}
                              {entry.moderator && <span className="apx-tag mod"><Icon name="sword" size={9} strokeWidth={2.5} /></span>}
                              {entry.banned && <span className="apx-tag danger">BANNI</span>}
                              {!entry.banned && entry.blocked && <span className="apx-tag danger">BLOQUÉ</span>}
                            </span>
                            <span className="apx-row-meta">
                              {entry.last_seen_at ? formatRelative(entry.last_seen_at) : 'jamais vu'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="apx-card apx-pane detail">
                  {!selected ? (
                    <div className="apx-empty tall">
                      <Icon name="users" size={26} />
                      <p>Sélectionnez un membre pour voir ses informations et agir dessus.</p>
                    </div>
                  ) : (
                    <>
                      <div className="apx-pane-head">
                        <span>{selected.pseudo}</span>
                        <button className="apx-x" onClick={() => setSelectedId(null)} aria-label="Fermer">×</button>
                      </div>
                      <div className="apx-detail-body">
                        <div className="apx-meta">
                          <div><small>Inscrit le</small>{formatDate(selected.created_at)}</div>
                          <div><small>Dernière activité</small>{selected.last_seen_at ? formatRelative(selected.last_seen_at) : 'jamais'}</div>
                          <div><small>Rooms</small>{selected.room_count ?? '—'}</div>
                          <div><small>Statut</small>{selected.banned ? 'Banni' : selected.blocked ? 'Bloqué' : 'Actif'}</div>
                        </div>

                        <button className="apx-btn" disabled={busy} onClick={() => generateResetCode(selected.pseudo)}>
                          <Icon name="gear" size={14} /> Code de réinitialisation
                        </button>
                        <button className="apx-btn" disabled={busy} onClick={() => toggleModerator(selected.pseudo, !selected.moderator)}>
                          <Icon name="sword" size={14} /> {selected.moderator ? "Retirer l'épée" : 'Nommer modérateur'}
                        </button>

                        {resetResult && (
                          <div className="apx-code">
                            <b>{resetResult.code}</b>
                            <button onClick={copyResetCode}>Copier</button>
                            <small>Pour {resetResult.pseudo} — affiché une seule fois, expire dans {resetResult.expiresInMinutes} min.</small>
                          </div>
                        )}

                        <div className="apx-danger">
                          <small>Zone dangereuse — suppression définitive du compte et de toutes ses données.</small>
                          <input
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder={`Retapez « ${selected.pseudo} »`}
                          />
                          <button
                            className="apx-btn danger"
                            disabled={busy || deleteConfirm !== selected.pseudo}
                            onClick={() => deleteAccount(selected.pseudo)}
                          >
                            Supprimer définitivement
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── MODÉRATION ─────────────────────────────── */}
            {section === 'moderation' && (
              <div className="apx-card apx-pane">
                <div className="apx-pane-head">
                  <span>Comptes suspendus{social.modCases.length ? ` · ${social.modCases.length}` : ''}</span>
                </div>
                {social.modCases.length === 0 ? (
                  <div className="apx-empty tall">
                    <Icon name="check" size={26} />
                    <p>Aucun compte suspendu — tout est calme. 🎬</p>
                  </div>
                ) : (
                  <div className="apx-list">
                    {social.modCases.map(modCase => (
                      <div className="apx-row static" key={modCase.userId}>
                        <span className="apx-dot danger" />
                        <span className="apx-row-name">
                          {modCase.pseudo}
                          <span className="apx-tag danger">{modCase.banned ? 'BANNI' : 'BLOQUÉ'}</span>
                          <small>« {modCase.term} »</small>
                        </span>
                        <button className="apx-btn mini" onClick={() => setChatWith({ userId: modCase.userId, pseudo: modCase.pseudo })}>
                          Discuter
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!isAdmin && (
                  <p className="apx-note">
                    En tant que modérateur : discutez avec les comptes suspendus et débloquez les
                    cas où le contexte est OK. Bannissements et outils de compte réservés à l'admin.
                  </p>
                )}
              </div>
            )}

            {/* ── STAFF ──────────────────────────────────── */}
            {section === 'staff' && isAdmin && (
              <div className="apx-card apx-pane">
                <div className="apx-pane-head">
                  <span>Modérateurs du site</span>
                </div>
                {activity?.some(u => u.moderator) ? (
                  <div className="apx-list">
                    {activity.filter(u => u.moderator).map(mod => (
                      <div className="apx-row static" key={mod.id}>
                        <span className="apx-dot online" />
                        <span className="apx-row-name">
                          {mod.pseudo}
                          <span className="apx-tag mod"><Icon name="sword" size={9} strokeWidth={2.5} /></span>
                        </span>
                        <button className="apx-btn mini" disabled={busy} onClick={() => toggleModerator(mod.pseudo, false)}>
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="apx-empty tall">
                    <Icon name="sword" size={26} />
                    <p>Aucun modérateur nommé. Nommez-en depuis la section Membres.</p>
                  </div>
                )}
                <p className="apx-note">
                  Les modérateurs portent l'épée verte. Pouvoirs : supprimer n'importe quel
                  message de discussion et n'importe quel avis.
                </p>
              </div>
            )}

            {isAdmin && (
              <p className="apx-note">
                Horodatage de dernière activité uniquement (déclaré dans la politique de
                confidentialité). Aucun contenu privé — messages, avis, rooms — n'est accessible ici.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

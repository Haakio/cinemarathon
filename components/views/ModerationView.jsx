import { useState } from 'react'
import Avatar from '../widgets/Avatar'
import AppealChat from '../widgets/AppealChat'
import { formatRelative } from '../../utils/format'

/**
 * Pupitre de bannissement — RÉSERVÉ À L'ADMIN DU SITE (entrée "Bannissement"
 * de la section Gestion). Dossiers en attente de verdict + comptes bannis.
 * Les données viennent de useSocial (déjà chargées, alertes en direct).
 */
export default function ModerationView({ social, avatarMap, isAdmin = false }) {
  const pending = social.modCases.filter(c => !c.banned)
  const banned = social.modCases.filter(c => c.banned)
  const [chatOpenId, setChatOpenId] = useState(null) // conversation dépliée

  const renderCase = modCase => {
    const custom = avatarMap[modCase.userId] || {}
    return (
      <div className="mod-case" key={modCase.userId}>
        <div className="mod-case-head">
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar pseudo={modCase.pseudo} emoji={custom.emoji || ''} hue={custom.hue ?? null} url={custom.url || ''} size={30} />
            <b>{modCase.pseudo}</b>
          </span>
          <span className={`chip ${modCase.banned ? '' : 'mod-pending'}`}>
            {modCase.banned ? 'Banni' : 'En attente de verdict'}
          </span>
        </div>
        <div className="mod-case-detail">
          Terme détecté : <b>« {modCase.term || '?' } »</b> — dans : {modCase.context || '?'}
          {modCase.blockedAt ? ` · ${formatRelative(modCase.blockedAt)}` : ''}
          {modCase.lastIp ? ` · IP : ${modCase.lastIp}` : ''}
        </div>
        {modCase.text && <div className="mod-case-text">« {modCase.text} »</div>}
        <div className="mod-case-actions">
          {modCase.banned ? (
            isAdmin ? (
              <button className="friend-accept" onClick={() => social.moderateCase('unban', modCase.userId)}>
                Débannir (compte + IP)
              </button>
            ) : (
              <span className="tmdb-hint" style={{ margin: 0 }}>Débannissement réservé à l'admin</span>
            )
          ) : (
            <>
              <button className="friend-accept" onClick={() => social.moderateCase('unblock', modCase.userId)}>
                Débloquer — contexte OK
              </button>
              {isAdmin ? (
                <>
                  <button className="friend-decline" onClick={() => social.moderateCase('ban', modCase.userId)}>
                    Bannir le compte
                  </button>
                  <button className="friend-decline" onClick={() => social.moderateCase('ban', modCase.userId, true)}>
                    Bannir compte + IP
                  </button>
                </>
              ) : (
                <span className="tmdb-hint" style={{ margin: 0 }}>Bannissement réservé à l'admin — signalez-lui les cas graves</span>
              )}
            </>
          )}
          <button
            className="friend-decline"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--gold)' }}
            onClick={() => setChatOpenId(chatOpenId === modCase.userId ? null : modCase.userId)}
          >
            {chatOpenId === modCase.userId ? 'Fermer la discussion' : '💬 Discuter'}
          </button>
        </div>
        {chatOpenId === modCase.userId && (
          <div style={{ marginTop: '12px' }}>
            <AppealChat targetUserId={modCase.userId} placeholder={`Répondre à ${modCase.pseudo}...`} />
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="view-head anim-up">
        <h1>Bannissement</h1>
        <p>Modération automatique : les messages haineux bloquent leur auteur — vous jugez le contexte.</p>
      </div>

      <div className="card anim-up-1" style={{ marginBottom: '20px' }}>
        <div className="card-title-row">
          <h2>⛔ En attente de verdict{pending.length ? ` (${pending.length})` : ''}</h2>
          <button className="btn-ghost" style={{ width: 'auto', marginTop: 0, padding: '7px 14px' }} onClick={social.reload}>
            Actualiser
          </button>
        </div>
        {pending.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
            Aucun dossier en attente. Le calme règne dans les salles. 🍿
          </p>
        ) : pending.map(renderCase)}
      </div>

      <div className="card anim-up-2">
        <h2>Comptes bannis{banned.length ? ` (${banned.length})` : ''}</h2>
        {banned.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Aucun compte banni.</p>
        ) : banned.map(renderCase)}
      </div>
    </>
  )
}

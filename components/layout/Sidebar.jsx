import Icon from '../widgets/Icon'
import { VIEWS } from '../../utils/constants'

/**
 * Navigation principale. Une entrée = une vue.
 * Icônes SVG vectorielles (voir widgets/Icon.jsx) — elles héritent de la
 * couleur du texte, donc passent en doré sur l'entrée active.
 */
const MAIN_ITEMS = [
  { id: VIEWS.OVERVIEW, icon: 'dashboard', label: "Vue d'ensemble" },
  { id: VIEWS.LISTE, icon: 'list', label: 'Liste du marathon' },
  { id: VIEWS.REGARDER, icon: 'play', label: 'Regarder' },
  { id: VIEWS.VU, icon: 'check', label: 'Déjà vu' },
  { id: VIEWS.CALENDRIER, icon: 'calendar', label: 'Calendrier' },
  { id: VIEWS.VOTE, icon: 'vote', label: 'Vote film' },
]

const INSIGHT_ITEMS = [
  { id: VIEWS.DISCUSSIONS, icon: 'message', label: 'Discussions' },
  { id: VIEWS.STATS, icon: 'chart', label: 'Statistiques' },
  { id: VIEWS.CLASSEMENT, icon: 'crown', label: 'Classement' },
]

export default function Sidebar({ view, onNavigate, currentRoom, memberCount, canManage, open, onClose, voteBadge = false, isSiteAdmin = false, modCount = 0 }) {
  const navigate = id => { onNavigate(id); onClose?.() }

  const renderItem = item => (
    <button
      key={item.id}
      className={`nav-item ${view === item.id ? 'active' : ''}`}
      onClick={() => navigate(item.id)}
    >
      <span className="nav-icon"><Icon name={item.icon} /></span>
      {item.label}
      {item.id === VIEWS.VOTE && voteBadge && (
        <span className="nav-bell" title="Un vote vous attend !">
          <Icon name="bell" size={12} strokeWidth={2.2} />
        </span>
      )}
    </button>
  )

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-room" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentRoom.image && (
            <img className="sidebar-room-img" src={currentRoom.image} alt=""
              onError={e => { e.target.style.display = 'none' }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-room-name">{currentRoom.name}</div>
            <div className="sidebar-room-meta">
              {(currentRoom.id === 'marvel' || currentRoom.is_private === false) ? 'Salle publique' : 'Salle privée'}
              {memberCount > 0 ? ` · ${memberCount} membre${memberCount > 1 ? 's' : ''}` : ''}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Marathon</div>
          {MAIN_ITEMS.map(renderItem)}
          <div className="sidebar-section">Analyse</div>
          {INSIGHT_ITEMS.map(renderItem)}
          {(canManage || isSiteAdmin) && (
            <>
              <div className="sidebar-section">Gestion</div>
              {canManage && renderItem({ id: VIEWS.ADMIN, icon: 'pen', label: 'Administration' })}
              {isSiteAdmin && (
                <button
                  className={`nav-item ${view === VIEWS.MODERATION ? 'active' : ''}`}
                  onClick={() => navigate(VIEWS.MODERATION)}
                >
                  <span className="nav-icon"><Icon name="shield" /></span>
                  Bannissement
                  {modCount > 0 && <span className="nav-bell" style={{ fontSize: '11px', fontWeight: 800 }}>{modCount}</span>}
                </button>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          Cinémarathon · fait pour les soirées entre amis
          <br />Développé avec l'aide d'une IA (Claude)
          <br />
          <a href="/mentions-legales" target="_blank" rel="noopener noreferrer">Mentions légales</a>
          {' · '}
          <a href="/confidentialite" target="_blank" rel="noopener noreferrer">Confidentialité</a>
          {' · '}
          <a href="/cgu" target="_blank" rel="noopener noreferrer">CGU</a>
        </div>
      </aside>
    </>
  )
}

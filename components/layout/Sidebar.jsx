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
]

const INSIGHT_ITEMS = [
  { id: VIEWS.DISCUSSIONS, icon: 'message', label: 'Discussions' },
  { id: VIEWS.STATS, icon: 'chart', label: 'Statistiques' },
  { id: VIEWS.CLASSEMENT, icon: 'crown', label: 'Classement' },
]

export default function Sidebar({ view, onNavigate, currentRoom, memberCount, canManage, open, onClose }) {
  const navigate = id => { onNavigate(id); onClose?.() }

  const renderItem = item => (
    <button
      key={item.id}
      className={`nav-item ${view === item.id ? 'active' : ''}`}
      onClick={() => navigate(item.id)}
    >
      <span className="nav-icon"><Icon name={item.icon} /></span>
      {item.label}
    </button>
  )

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-room">
          <div className="sidebar-room-name">{currentRoom.name}</div>
          <div className="sidebar-room-meta">
            {currentRoom.id === 'marvel' ? 'Salle publique' : 'Salle privée'}
            {memberCount > 0 ? ` · ${memberCount} membre${memberCount > 1 ? 's' : ''}` : ''}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Marathon</div>
          {MAIN_ITEMS.map(renderItem)}
          <div className="sidebar-section">Analyse</div>
          {INSIGHT_ITEMS.map(renderItem)}
          {canManage && (
            <>
              <div className="sidebar-section">Gestion</div>
              {renderItem({ id: VIEWS.ADMIN, icon: 'pen', label: 'Administration' })}
            </>
          )}
        </nav>

        <div className="sidebar-footer">Cinémarathon · fait pour les soirées entre amis</div>
      </aside>
    </>
  )
}

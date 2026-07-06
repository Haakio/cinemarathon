import { useMemo, useRef, useState, useEffect } from 'react'
import Avatar from '../widgets/Avatar'
import Icon from '../widgets/Icon'
import { TYPE_META } from '../../utils/constants'

/**
 * Header global : logo, recherche globale, profil (avec pastille de
 * notifications non lues), déconnexion.
 * La recherche filtre la watchlist déjà en mémoire (zéro requête réseau).
 */
export default function Header({
  currentUser, watchlist, watched,
  onOpenItem, onToggleSidebar, onLogout,
  profile, unreadCount, onOpenProfile, voteBadge = false,
  isSiteAdmin = false, onOpenAdminPanel, modBadgeCount = 0,
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)

  // Fermer les résultats au clic extérieur
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return watchlist
      .filter(item => item.title.toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, watchlist])

  const seenIds = useMemo(() => new Set(watched.map(w => w.item_id)), [watched])

  return (
    <header className="topbar">
      <button className="topbar-burger" onClick={onToggleSidebar} aria-label="Menu" style={{ position: 'relative' }}>
        ☰
        {voteBadge && <span className="notif-dot header-dot" style={{ fontSize: 0, minWidth: 10, height: 10, padding: 0 }} />}
      </button>
      <div className="topbar-logo">CINÉMARATHON</div>

      <div className="global-search" ref={wrapRef}>
        <span className="search-icon"><Icon name="search" size={15} /></span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Rechercher un film, une série..."
          aria-label="Recherche globale"
        />
        {focused && query.trim() && (
          <div className="search-results">
            {results.length === 0 ? (
              <div className="search-empty">Aucun titre trouvé dans ce marathon.</div>
            ) : results.map(item => (
              <button
                key={item.id}
                className="search-result"
                onClick={() => { onOpenItem(item); setQuery(''); setFocused(false) }}
              >
                {item.poster
                  ? <img src={item.poster} alt="" onError={e => { e.target.style.display = 'none' }} />
                  : <span className="sr-ph">{(TYPE_META[item.type] || TYPE_META.film).icon}</span>}
                <span>
                  {item.title}{item.year ? ` (${item.year})` : ''}
                  <small>
                    {(TYPE_META[item.type] || TYPE_META.film).label}
                    {seenIds.has(item.id) ? ' · ✓ Vu' : ''}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {isSiteAdmin && (
          <button className="panel-btn" onClick={onOpenAdminPanel} title="Panel Modération">
            <Icon name="shield" size={16} />
            {modBadgeCount > 0 && <span className="notif-dot header-dot">{modBadgeCount}</span>}
          </button>
        )}
        <button className="user-menu-btn" onClick={onOpenProfile} title="Mon profil">
          <div className="avatar-badge-wrap">
            <Avatar
              pseudo={currentUser?.pseudo}
              emoji={profile?.avatarEmoji || ''}
              hue={profile?.avatarHue ?? null}
              url={profile?.avatarUrl || ''}
              size={34}
            />
            {unreadCount > 0 && <span className="notif-dot header-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>
          <span className="user-name">{currentUser?.pseudo}</span>
        </button>
        <button className="btn-logout" onClick={onLogout}>Quitter</button>
      </div>
    </header>
  )
}

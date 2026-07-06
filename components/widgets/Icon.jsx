/**
 * Icônes SVG vectorielles (style "line icons" type Lucide/Feather).
 * Zéro dépendance : les tracés sont inline. `currentColor` fait qu'elles
 * héritent automatiquement de la couleur du texte (doré quand actif, etc.).
 */
const PATHS = {
  // Vue d'ensemble — grille de dashboard
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  // Liste du marathon
  list: (
    <>
      <line x1="9" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18" x2="21" y2="18" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </>
  ),
  // Regarder
  play: <path d="M7 4.5l13 7.5-13 7.5V4.5z" />,
  // Déjà vu
  check: (
    <>
      <path d="M22 11.1V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14l-3-3" />
    </>
  ),
  // Calendrier
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  // Discussions
  message: <path d="M21 14.5a2 2 0 0 1-2 2H7.5L3 20.5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5z" />,
  // Statistiques
  chart: (
    <>
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </>
  ),
  // Classement
  crown: <path d="M3 7.5l4.7 3.6L12 4.5l4.3 6.6L21 7.5l-2 11H5l-2-11z" />,
  // Administration
  pen: <path d="M17 3.5a2.4 2.4 0 1 1 3.5 3.5L7.5 20 2.5 21.5 4 16.5 17 3.5z" />,
  // Recherche
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.3" y2="16.3" />
    </>
  ),
  // Amis (réserve pour usages futurs)
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4.5-6.2" />
    </>
  ),
  // Salles (hub des rooms)
  door: (
    <>
      <path d="M13 3.5H6a1 1 0 0 0-1 1v16h8" />
      <path d="M13 3.5l6 1.8V19l-6 1.5V3.5z" />
      <circle cx="15.4" cy="12" r="0.6" />
    </>
  ),
  // Épée (modérateur du site)
  sword: (
    <>
      <path d="M20.5 3.5h-4L8 12l3.5 3.5 8.5-8.5v-3.5z" />
      <line x1="6" y1="12" x2="11.5" y2="17.5" />
      <line x1="8.5" y1="15" x2="4" y2="19.5" />
      <circle cx="3.5" cy="20" r="0.8" />
    </>
  ),
  // Bouclier (modération)
  shield: (
    <>
      <path d="M12 2.5l7.5 3v6c0 4.8-3.2 8.4-7.5 10-4.3-1.6-7.5-5.2-7.5-10v-6l7.5-3z" />
      <path d="M9 12l2 2 4-4.5" />
    </>
  ),
  // Réglages (engrenage)
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  // Vote (urne avec bulletin)
  vote: (
    <>
      <path d="M4 11h16l1.5 9.5h-19L4 11z" />
      <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
      <path d="M8.5 11V4.5A1.5 1.5 0 0 1 10 3h4a1.5 1.5 0 0 1 1.5 1.5V11" />
      <path d="M10.5 7l1.2 1.2 2.3-2.4" />
    </>
  ),
  // Notifications (réserve)
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10.3 20.5a2 2 0 0 0 3.4 0" />
    </>
  ),
}

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '' }) {
  const paths = PATHS[name]
  if (!paths) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}

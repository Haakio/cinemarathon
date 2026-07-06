import Icon from './Icon'

/**
 * Épée verte des modérateurs du site — affichée à côté du pseudo,
 * partout où les avatars personnalisés circulent (avatarMap).
 */
export default function ModBadge({ entry }) {
  if (!entry?.moderator) return null
  return (
    <span className="mod-sword" title="Modérateur du site">
      <Icon name="sword" size={12} strokeWidth={2.2} />
    </span>
  )
}

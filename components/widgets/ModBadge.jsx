import Icon from './Icon'

/**
 * Badge de staff à côté du pseudo (après les tags) :
 * - Bouclier ROUGE : l'admin du site — survol : "Admin"
 * - Épée VERTE : les modérateurs nommés — survol : "Modération"
 */
export default function ModBadge({ entry }) {
  const adminPseudo = process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  const isSiteAdmin = Boolean(entry?.pseudo) && Boolean(adminPseudo) && entry.pseudo === adminPseudo

  if (isSiteAdmin) {
    return (
      <span className="mod-shield" data-tip="Admin">
        <Icon name="shield" size={12} strokeWidth={2.2} />
      </span>
    )
  }
  if (entry?.moderator) {
    return (
      <span className="mod-sword" data-tip="Modération">
        <Icon name="sword" size={12} strokeWidth={2.2} />
      </span>
    )
  }
  return null
}

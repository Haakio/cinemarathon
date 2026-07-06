import Icon from './Icon'

/**
 * Badge de staff à côté du pseudo (après les tags) :
 * - Bouclier ROUGE : l'admin du site — basé sur le PSEUDO directement,
 *   donc toujours affiché (aucune dépendance aux données d'avatars)
 * - Épée VERTE : les modérateurs nommés (flag de l'avatarMap)
 */
export default function ModBadge({ entry, pseudo = '' }) {
  const adminPseudo = process.env.NEXT_PUBLIC_ADMIN_PSEUDO
  const who = pseudo || entry?.pseudo || ''
  const isSiteAdmin = Boolean(who) && Boolean(adminPseudo) && who === adminPseudo

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

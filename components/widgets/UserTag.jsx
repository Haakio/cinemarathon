import { TAG_COLORS } from '../../utils/constants'

/**
 * Petit tag coloré à côté d'un pseudo (attribué par l'admin du site).
 * Si un texte de survol a été défini, il apparaît en tooltip au hover —
 * parfait pour les private jokes. 😄
 */
export default function UserTag({ entry }) {
  const label = entry?.tagLabel
  if (!label) return null
  const hex = TAG_COLORS[entry.tagColor] || TAG_COLORS.gold
  return (
    <span
      className="user-tag"
      data-tip={entry.tagTip || undefined}
      style={{
        color: hex,
        borderColor: `${hex}80`,
        background: `${hex}1a`,
        cursor: entry.tagTip ? 'help' : 'default',
      }}
    >
      {label}
    </span>
  )
}

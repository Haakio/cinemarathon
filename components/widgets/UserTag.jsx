import { TAG_COLORS } from '../../utils/constants'

/**
 * Petit tag coloré à côté d'un pseudo (attribué par l'admin du site).
 * Usage : <UserTag entry={avatarMap[userId] || avatarMap[pseudo]} />
 */
export default function UserTag({ entry }) {
  const label = entry?.tagLabel
  if (!label) return null
  const hex = TAG_COLORS[entry.tagColor] || TAG_COLORS.gold
  return (
    <span
      className="user-tag"
      style={{
        color: hex,
        borderColor: `${hex}80`,
        background: `${hex}1a`,
      }}
    >
      {label}
    </span>
  )
}

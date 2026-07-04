import { useMemo, useState } from 'react'
import MovieCard from '../cards/MovieCard'
import { LIST_FILTERS } from '../../utils/constants'
import { getSeenItemIds } from '../../utils/stats'
import { mcuRank } from '../../lib/mcuChrono'

/**
 * Liste du marathon : grille de cartes premium avec filtres.
 * Filtrage 100 % client sur les données déjà chargées.
 */
/**
 * Ordre de la liste : "chronologique" dans Marvel (l'ordre de l'histoire),
 * sinon "marathon". Marvel gagne aussi "MCU (chrono)" : uniquement les
 * titres du MCU, dans l'ordre de la chronologie officielle.
 */
const sortOptions = isMarvel => [
  ['marathon', isMarvel ? 'Ordre chronologique' : 'Ordre marathon'],
  ...(isMarvel ? [['mcu', 'MCU (chrono)']] : []),
  ['release-asc', 'Sortie ↑'],
  ['release-desc', 'Sortie ↓'],
]

export default function ListView({ currentRoom, watchlist, watched, seenSource, currentUser, onWatch, onOpenDetails }) {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('marathon')

  // En room publique, seenSource = uniquement mes visionnages
  const seen = seenSource || watched
  const seenIds = useMemo(() => getSeenItemIds(seen), [seen])
  const seenSet = useMemo(() => new Set(seenIds), [seenIds])

  const items = useMemo(() => {
    let list = [...watchlist]
    if (filter === 'film') list = list.filter(i => i.type === 'film')
    if (filter === 'serie') list = list.filter(i => i.type === 'serie')
    if (filter === 'anime') list = list.filter(i => i.type === 'anime')
    if (filter === 'seen') list = list.filter(i => seenSet.has(i.id))
    if (filter === 'unseen') list = list.filter(i => !seenSet.has(i.id))

    // Mode MCU : uniquement les titres du MCU, dans l'ordre chronologique
    // officiel (X-Men, Blade et autres Marvel hors MCU sont masqués).
    if (sort === 'mcu') {
      return list
        .map(item => ({ item, rank: mcuRank(item.title) }))
        .filter(entry => entry.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.item.order - b.item.order)
        .map(entry => entry.item)
    }

    // Tri par date de sortie : date TMDB complète si disponible (départage
    // les titres d'une même année), sinon milieu d'année approximatif.
    if (sort !== 'marathon') {
      const asc = sort === 'release-asc'
      const dateOf = item => {
        if (item.release_date) {
          const time = Date.parse(item.release_date)
          if (!Number.isNaN(time)) return time
        }
        const year = parseInt(item.year, 10)
        if (year) return Date.parse(`${year}-06-30`)
        return asc ? Infinity : -Infinity // sans date → fin de liste
      }
      list.sort((a, b) => asc ? dateOf(a) - dateOf(b) : dateOf(b) - dateOf(a))
    }
    return list
  }, [watchlist, filter, sort, seenSet])

  const myRatings = useMemo(() => {
    const map = new Map()
    watched.forEach(w => { if (w.user_id === currentUser?.id) map.set(w.item_id, w.rating) })
    return map
  }, [watched, currentUser])

  return (
    <>
      <div className="view-head anim-up">
        <h1>Liste du marathon</h1>
        <p>
          Room : {currentRoom.name}
          {watchlist.length > 0
            ? ` · ${seenIds.length} / ${watchlist.length} visionné${seenIds.length > 1 ? 's' : ''}`
            : " · Ajoutez des titres depuis l'onglet Administration"}
        </p>
      </div>

      <div className="filters anim-up-1">
        {LIST_FILTERS.map(([value, label]) => (
          <button key={value} className={`filter-btn ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
        <span className="filters-divider" />
        {sortOptions(currentRoom.id === 'marvel').map(([value, label]) => (
          <button key={value} className={`filter-btn ${sort === value ? 'active' : ''}`} onClick={() => setSort(value)}>
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎬</div>
          <p>Aucun titre à afficher.<br />Ajoutez-en dans l'onglet Administration !</p>
        </div>
      ) : (
        <div className="movies-grid">
          {items.map(item => (
            <MovieCard
              key={item.id}
              item={item}
              isSeen={seenSet.has(item.id)}
              myRating={myRatings.get(item.id)}
              onWatch={onWatch}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      )}
    </>
  )
}

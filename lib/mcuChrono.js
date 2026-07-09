/**
 * Liste MCU officielle du site (définie par Haakio) : les 35 films, dans
 * cet ordre exact. Le mode "MCU (chrono)" de la room Marvel n'affiche
 * QUE ces titres, dans cet ordre — tout le reste (séries, X-Men, Blade,
 * Venom, 4 Fantastiques...) est masqué.
 *
 * Correspondance des titres : motifs normalisés (minuscules, sans accents
 * ni ponctuation). Le motif le plus long gagne ("Iron Man 2" ne retombe
 * pas sur "Iron Man"). Un motif préfixé par "=" exige une égalité EXACTE
 * (évite que "Thor : Love and Thunder" matche "Thor").
 * Pour changer l'ordre : déplacez les lignes.
 */
const MCU_CHRONO = [
  { n: 'Iron Man', p: ['ironman'] },
  { n: "L'Incroyable Hulk", p: ['incroyablehulk', 'incrediblehulk'] },
  { n: 'Iron Man 2', p: ['ironman2'] },
  { n: 'Thor', p: ['=thor'] },
  { n: 'Captain America : First Avenger', p: ['firstavenger'] },
  { n: 'Avengers', p: ['=avengers', '=theavengers'] },
  { n: 'Iron Man 3', p: ['ironman3'] },
  { n: 'Thor : Le Monde des ténèbres', p: ['mondedestenebres', 'thordarkworld'] },
  { n: "Captain America : Le Soldat de l'hiver", p: ['americalesoldat', 'americathewintersoldier'] },
  { n: 'Les Gardiens de la Galaxie', p: ['=lesgardiensdelagalaxie', '=gardiensdelagalaxie', '=guardiansofthegalaxy'] },
  { n: "Avengers : L'Ère d'Ultron", p: ['eredultron', 'ageofultron'] },
  { n: 'Ant-Man', p: ['=antman'] },
  { n: 'Captain America : Civil War', p: ['civilwar'] },
  { n: 'Doctor Strange', p: ['doctorstrange'] },
  { n: 'Les Gardiens de la Galaxie Vol. 2', p: ['gardiensdelagalaxievol2', 'gardiensdelagalaxie2', 'guardiansofthegalaxyvol2'] },
  { n: 'Spider-Man : Homecoming', p: ['homecoming'] },
  { n: 'Thor : Ragnarok', p: ['ragnarok'] },
  { n: 'Black Panther', p: ['blackpanther'] },
  { n: 'Avengers : Infinity War', p: ['infinitywar'] },
  { n: 'Ant-Man et la Guêpe', p: ['antmanetlaguepe', 'antmanandthewasp'] },
  { n: 'Captain Marvel', p: ['captainmarvel'] },
  { n: 'Avengers : Endgame', p: ['endgame'] },
  { n: 'Spider-Man : Far From Home', p: ['farfromhome'] },
  { n: 'Black Widow', p: ['blackwidow'] },
  { n: 'Shang-Chi et la Légende des Dix Anneaux', p: ['shangchi'] },
  { n: 'Les Éternels', p: ['eternels', 'eternals'] },
  { n: 'Spider-Man : No Way Home', p: ['nowayhome'] },
  { n: 'Doctor Strange in the Multiverse of Madness', p: ['multiverseofmadness', 'multiversdelafolie'] },
  { n: 'Black Panther : Wakanda Forever', p: ['wakandaforever'] },
  { n: 'Ant-Man et la Guêpe : Quantumania', p: ['antmanetlaguepequantumania', 'quantumania'] },
  { n: 'Les Gardiens de la Galaxie Vol. 3', p: ['gardiensdelagalaxievol3', 'gardiensdelagalaxie3', 'guardiansofthegalaxyvol3'] },
  { n: 'The Marvels', p: ['themarvels'] },
  { n: 'Deadpool & Wolverine', p: ['deadpoolwolverine', 'deadpooletwolverine', 'deadpoolandwolverine'] },
  { n: 'Captain America : Brave New World', p: ['bravenewworld'] },
  { n: 'Thunderbolts', p: ['thunderbolts'] },
]

/** Normalise un titre : minuscules, sans accents, sans ponctuation ni espaces. */
function normalize(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD') // décompose les accents (é → e + ́)
    .replace(/[^a-z0-9]/g, '') // ne garde que lettres et chiffres
}

/**
 * Rang MCU d'un titre (index dans la liste ci-dessus), ou -1 si hors MCU.
 * Motif "=xxx" : égalité exacte requise. Sinon : inclusion, le plus long gagne.
 */
export function mcuRank(title) {
  const norm = normalize(title)
  if (!norm) return -1
  let bestRank = -1
  let bestLength = 0
  MCU_CHRONO.forEach((entry, index) => {
    entry.p.forEach(pattern => {
      const exact = pattern.startsWith('=')
      const value = exact ? pattern.slice(1) : pattern
      const matches = exact ? norm === value : norm.includes(value)
      if (matches && value.length > bestLength) {
        bestRank = index
        bestLength = value.length
      }
    })
  })
  return bestRank
}

/**
 * Applique un mode de tri ("marathon" | "mcu" | "release-asc" | "release-desc")
 * à une liste de titres. Partagé entre la Liste (affichage) et Regarder
 * (ordre de visionnage), pour que les deux restent cohérents.
 */
export function sortByMode(list, sort) {
  if (sort === 'mcu') {
    return list
      .map(item => ({ item, rank: mcuRank(item.title) }))
      .filter(entry => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.item.order - b.item.order)
      .map(entry => entry.item)
  }

  if (sort === 'release-asc' || sort === 'release-desc') {
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
    return [...list].sort((a, b) => asc ? dateOf(a) - dateOf(b) : dateOf(b) - dateOf(a))
  }

  return list
}

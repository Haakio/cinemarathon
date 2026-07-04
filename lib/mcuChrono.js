/**
 * Chronologie MCU (ordre de l'histoire, films + séries) — utilisée par le
 * tri "MCU (chrono)" de la room Marvel. Les films Marvel hors MCU
 * (X-Men, Blade, 4 Fantastiques de la Fox, Ghost Rider...) n'y figurent pas.
 *
 * Chaque entrée liste des motifs normalisés (minuscules, sans accents ni
 * ponctuation). Un titre de la watchlist est rattaché à l'entrée dont le
 * motif correspondant est le PLUS LONG (évite "Iron Man 2" → "Iron Man").
 * Pour ajuster l'ordre : déplacez simplement les lignes.
 */
const MCU_CHRONO = [
  { n: 'Captain America : First Avenger', p: ['firstavenger'] },
  { n: 'Agent Carter', p: ['agentcarter'] },
  { n: 'Captain Marvel', p: ['captainmarvel'] },
  { n: 'Iron Man', p: ['ironman'] },
  { n: 'Iron Man 2', p: ['ironman2'] },
  { n: "L'Incroyable Hulk", p: ['incroyablehulk', 'incrediblehulk'] },
  { n: 'Thor', p: ['thor'] },
  { n: 'Avengers', p: ['avengers'] },
  { n: 'Iron Man 3', p: ['ironman3'] },
  { n: 'Agents du S.H.I.E.L.D.', p: ['agentsdushield', 'agentsofshield'] },
  { n: 'Thor : Le Monde des ténèbres', p: ['mondedestenebres', 'thordarkworld'] },
  { n: "Captain America : Le Soldat de l'hiver", p: ['soldatdelhiver', 'wintersoldier'] },
  { n: 'Les Gardiens de la Galaxie', p: ['gardiensdelagalaxie', 'guardiansofthegalaxy'] },
  { n: 'Les Gardiens de la Galaxie Vol. 2', p: ['gardiensdelagalaxievol2', 'guardiansofthegalaxyvol2', 'galaxievolume2'] },
  { n: 'Daredevil', p: ['daredevil'] },
  { n: 'Jessica Jones', p: ['jessicajones'] },
  { n: "Avengers : L'Ère d'Ultron", p: ['avengersleredultron', 'eredultron', 'ageofultron'] },
  { n: 'Ant-Man', p: ['antman'] },
  { n: 'Luke Cage', p: ['lukecage'] },
  { n: 'Iron Fist', p: ['ironfist'] },
  { n: 'Captain America : Civil War', p: ['civilwar'] },
  { n: 'Black Widow', p: ['blackwidow'] },
  { n: 'The Defenders', p: ['defenders'] },
  { n: 'The Punisher', p: ['punisher'] },
  { n: 'Black Panther', p: ['blackpanther'] },
  { n: 'Spider-Man : Homecoming', p: ['homecoming'] },
  { n: 'Doctor Strange', p: ['doctorstrange'] },
  { n: 'Thor : Ragnarok', p: ['ragnarok'] },
  { n: 'Ant-Man et la Guêpe', p: ['antmanetlaguepe', 'antmanandthewasp'] },
  { n: 'Avengers : Infinity War', p: ['infinitywar'] },
  { n: 'Avengers : Endgame', p: ['endgame'] },
  { n: 'Loki', p: ['loki'] },
  { n: 'WandaVision', p: ['wandavision'] },
  { n: "Falcon et le Soldat de l'hiver", p: ['falconetlesoldat', 'falconandthewinter'] },
  { n: 'Spider-Man : Far From Home', p: ['farfromhome'] },
  { n: 'Shang-Chi et la Légende des Dix Anneaux', p: ['shangchi'] },
  { n: 'Les Éternels', p: ['eternels', 'eternals'] },
  { n: 'Hawkeye', p: ['hawkeye'] },
  { n: 'Spider-Man : No Way Home', p: ['nowayhome'] },
  { n: 'Moon Knight', p: ['moonknight'] },
  { n: 'Doctor Strange in the Multiverse of Madness', p: ['multiverseofmadness', 'multiversdelafolie'] },
  { n: 'Miss Marvel', p: ['missmarvel', 'msmarvel'] },
  { n: 'Thor : Love and Thunder', p: ['loveandthunder'] },
  { n: 'She-Hulk', p: ['shehulk'] },
  { n: 'Werewolf by Night', p: ['werewolfbynight'] },
  { n: 'Black Panther : Wakanda Forever', p: ['wakandaforever'] },
  { n: 'Ant-Man et la Guêpe : Quantumania', p: ['quantumania'] },
  { n: 'Les Gardiens de la Galaxie Vol. 3', p: ['gardiensdelagalaxievol3', 'guardiansofthegalaxyvol3', 'galaxievolume3'] },
  { n: 'Secret Invasion', p: ['secretinvasion'] },
  { n: 'The Marvels', p: ['themarvels'] },
  { n: 'Echo', p: ['echo'] },
  { n: 'What If...?', p: ['whatif'] },
  { n: 'Deadpool & Wolverine', p: ['deadpooletwolverine', 'deadpoolwolverine', 'deadpoolandwolverine'] },
  { n: 'Agatha All Along', p: ['agatha'] },
  { n: 'Daredevil : Born Again', p: ['daredevilbornagain'] },
  { n: 'Captain America : Brave New World', p: ['bravenewworld'] },
  { n: 'Thunderbolts', p: ['thunderbolts'] },
  { n: 'Ironheart', p: ['ironheart'] },
  { n: 'Les 4 Fantastiques : Premiers Pas', p: ['premierspas', 'firststeps'] },
]

/** Normalise un titre : minuscules, sans accents, sans ponctuation ni espaces. */
function normalize(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD') // décompose les accents (é → e + ́)
    .replace(/[^a-z0-9]/g, '') // ne garde que lettres et chiffres
}

/**
 * Rang chronologique MCU d'un titre, ou -1 s'il n'est pas du MCU.
 * Le motif le plus long qui correspond gagne (précision maximale).
 */
export function mcuRank(title) {
  const norm = normalize(title)
  if (!norm) return -1
  let bestRank = -1
  let bestLength = 0
  MCU_CHRONO.forEach((entry, index) => {
    entry.p.forEach(pattern => {
      if (pattern.length > bestLength && norm.includes(pattern)) {
        bestRank = index
        bestLength = pattern.length
      }
    })
  })
  return bestRank
}

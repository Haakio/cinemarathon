/**
 * Modération automatique : détection de propos haineux (racistes,
 * homophobes, antisémites...). Les simples grossièretés ne sont PAS
 * filtrées — seuls les termes discriminatoires déclenchent le blocage.
 *
 * Détection par MOTS ENTIERS après normalisation (accents, chiffres-lettres,
 * lettres étirées, espaces d'évitement), pour limiter les faux positifs.
 * L'admin du site juge ensuite le contexte : déblocage ou bannissement.
 */

// Termes interdits (comparés aux mots entiers, forme normalisée)
const SLURS = new Set([
  // racistes / antisémites
  'negre', 'negres', 'negresse', 'negresses', 'negro', 'negros', 'negrillon',
  'bamboula', 'bamboulas', 'bougnoule', 'bougnoules', 'bicot', 'bicots',
  'youpin', 'youpins', 'youpine', 'youpines', 'niakoue', 'niakoues',
  'chinetoque', 'chinetoques', 'crouille', 'crouilles',
  // homophobes / transphobes
  'pede', 'pedes', 'pd', 'tarlouze', 'tarlouzes', 'tafiole', 'tafioles',
  'fiotte', 'fiottes', 'gouine', 'gouines', 'travelo', 'travelos',
  'tapette', 'tapettes',
  // anglais courants
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots',
  'kike', 'chink', 'spic', 'wetback',
])

// Expressions en deux mots ("sale
// + cible") — comparées aux paires de mots adjacents accolées
const PAIRS = new Set([
  'salearabe', 'salesarabes', 'salejuif', 'salejuive', 'salesjuifs',
  'salenoir', 'salenoire', 'salesnoirs', 'saleblanc', 'saleblanche',
  'salerebeu', 'salerenoi', 'saleblack', 'salegitan', 'salegitane',
  'salechinois', 'salemusulman', 'salemusulmane', 'salepede',
])

/** Normalise : minuscules, accents retirés, chiffres → lettres, étirements réduits. */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a').replace(/\$/g, 's')
    .replace(/(.)\1{2,}/g, '$1') // "pééééédé" → "pédé"
}

/**
 * Analyse un texte. @returns {string|null} le terme détecté, ou null si propre.
 */
export function checkForbidden(text) {
  const tokens = normalize(text).split(/[^a-z]+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    if (SLURS.has(tokens[i])) return tokens[i]
    if (i + 1 < tokens.length) {
      const pair = tokens[i] + tokens[i + 1]
      // Paires : "sale arabe", mais aussi les mots découpés ("ta pette")
      if (PAIRS.has(pair) || SLURS.has(pair)) return `${tokens[i]} ${tokens[i + 1]}`
    }
  }
  return null
}

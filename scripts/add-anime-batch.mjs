// Script ponctuel : crée un compte, rejoint la room via invitation, attend
// les droits admin, puis ajoute la liste d'animes demandée (tag "anime"),
// sans dupliquer ce qui est déjà présent dans la room.
// Usage: node scripts/add-anime-batch.mjs

const BASE = 'https://xn--cinmarathon-dbb.com'
const INVITE_TOKEN = '2eez8349kijibfwffi0g5l'
const PSEUDO = 'ClaudeBot' + Math.floor(1000 + Math.random() * 9000)
const PASSWORD = 'Cm-' + Math.random().toString(36).slice(2, 10) + 'X!9'

const ANIME_TITLES = [
  "L'Attaque des Titans",
  'Jujutsu Kaisen',
  'Death Note',
  'Tokyo Ghoul',
  'Kaiju No. 8',
  'Classroom of the Elite',
  'Rokka: Braves of the Six Flowers',
  'Cheat Skill Level Up',
  'Shangri-La Frontier',
  'Vinland Saga',
  'Mashle',
  'Solo Leveling',
  'The Daily Life of the Immortal King',
  'Baki',
  'One Punch Man',
  'Rising Impact',
  'Pluto',
  'High-Rise Invasion',
  'Kengan Ashura',
  'Castlevania: Nocturne',
  'One Piece',
  'Black Clover',
  'My Hero Academia',
  "Hell's Paradise",
  'Fire Force',
  'Shine On! Bakumatsu Bad Boys!',
  'Frieren',
  'Saga of Tanya the Evil',
  'Ao Ashi',
  'Haikyuu!!',
  'Chillin\' in Another World with Level 2 Super Cheat Powers',
  'Dragon Raja',
  'Viral Hit',
  'Dead Mount Death Play',
  'Bungo Stray Dogs',
  'Noble New World Adventure',
  'The Greatest Demon Lord Is Reborn as a Typical Nobody',
  'The Rising of the Shield Hero',
  'The Seven Deadly Sins',
]

let token = null

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function api(method, path, body, { retries = 3 } = {}) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(BASE + '/api' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const refreshed = res.headers.get('X-Refreshed-Token')
      if (refreshed) token = refreshed
      const raw = await res.text()
      let data = null
      try { data = raw ? JSON.parse(raw) : null } catch {
        throw Object.assign(new Error(`Réponse non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`), { status: res.status })
      }
      if (!res.ok) {
        const err = new Error((data && data.error) || `HTTP ${res.status}`)
        err.status = res.status
        throw err
      }
      return data
    } catch (err) {
      lastErr = err
      // 403/401/4xx : inutile de retenter, c'est une vraie erreur métier.
      if (err.status && err.status < 500) throw err
      if (i < retries) await sleep(1500 * (i + 1))
    }
  }
  throw lastErr
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`[1/5] Création du compte ${PSEUDO}...`)
  const reg = await api('POST', '/auth/register', { pseudo: PSEUDO, password: PASSWORD, acceptTerms: true })
  token = reg.token
  console.log(`  OK — user id ${reg.user.id}`)

  console.log('[2/5] Rejoindre la room via invitation...')
  const room = await api('POST', '/auth/rooms', { action: 'joinInvite', token: INVITE_TOKEN })
  console.log(`  OK — room "${room.name}" (id ${room.id})`)

  console.log('[3/5] Attente des droits (15s pour que tu passes le compte en admin de la room)...')
  await sleep(15000)

  console.log('[4/5] Récupération de la liste actuelle de la room...')
  const existing = await api('GET', `/auth/watchlist?roomId=${room.id}`)
  const existingNames = new Set(existing.map(i => normalize(i.title)))
  console.log(`  ${existing.length} titre(s) déjà présent(s).`)

  const toAdd = ANIME_TITLES.filter(t => !existingNames.has(normalize(t)))
  console.log(`[5/5] Ajout de ${toAdd.length}/${ANIME_TITLES.length} anime(s) (les autres sont déjà dans la room)...`)

  const results = { added: [], failed: [], noMatch: [] }
  let writeAccessConfirmed = false

  for (const title of toAdd) {
    try {
      let payload = { roomId: room.id, title, type: 'anime' }
      try {
        const search = await api('GET', `/auth/tmdb?query=${encodeURIComponent(title)}`)
        const best = (search.results || []).find(r => r.mediaType === 'tv') || (search.results || [])[0]
        if (best) {
          const details = await api('GET', `/auth/tmdb?mediaType=${best.mediaType}&tmdbId=${best.tmdbId}`)
          const d = details.details
          payload = {
            roomId: room.id,
            title: d.title || title,
            type: 'anime',
            poster: d.poster || '',
            year: d.year || '',
            synopsis: d.synopsis || '',
            runtime: d.runtime || 0,
            genres: d.genres || '',
            tmdbId: d.tmdbId,
            backdrop: d.backdrop || '',
            cast: d.cast || [],
            releaseDate: d.releaseDate || '',
          }
        } else {
          results.noMatch.push(title)
        }
      } catch (tmdbErr) {
        console.log(`  (TMDB indispo pour "${title}": ${tmdbErr.message} — ajout sans métadonnées)`)
      }

      if (!writeAccessConfirmed) {
        // Premier ajout : on retente tant que les droits admin n'ont pas
        // encore été accordés côté site (403 "Interdit").
        for (let attempt = 1; ; attempt++) {
          try {
            await api('POST', '/auth/watchlist', payload)
            writeAccessConfirmed = true
            break
          } catch (err) {
            if (err.status !== 403 || attempt >= 20) throw err
            console.log(`  Toujours pas les droits admin (essai ${attempt}/20), nouvelle tentative dans 10s...`)
            await sleep(10000)
          }
        }
      } else {
        await api('POST', '/auth/watchlist', payload)
      }
      results.added.push(payload.title)
      console.log(`  + ${payload.title}`)
      await sleep(400)
    } catch (err) {
      results.failed.push(`${title}: ${err.message}`)
      console.log(`  ! Échec "${title}": ${err.message}`)
    }
  }

  console.log('\n=== Résumé ===')
  console.log(`Ajoutés (${results.added.length}):`, results.added.join(', ') || '(aucun)')
  if (results.noMatch.length) console.log(`Sans correspondance TMDB mais ajoutés bruts:`, results.noMatch.join(', '))
  if (results.failed.length) console.log(`Échecs (${results.failed.length}):`, results.failed.join(' | '))
  console.log(`Compte utilisé: ${PSEUDO} / ${PASSWORD}`)
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})

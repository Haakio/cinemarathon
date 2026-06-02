import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'

const DEADLINE = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

const FILMS = [
  { file: 'inception.jpg',             title: 'Inception',                          year: 2010, indices: ['Un homme plante des idées dans les rêves', 'On ne sait plus ce qui est réel', 'Leonardo DiCaprio, une toupie'] },
  { file: 'matrix.jpg',                title: 'The Matrix',                          year: 1999, indices: ['Pilule rouge ou bleue ?', 'La réalité est une simulation', 'Keanu Reeves en imperméable noir'] },
  { file: 'interstellar.jpg',          title: 'Interstellar',                        year: 2014, indices: ["Un père quitte la Terre pour sauver l'humanité", 'Un trou noir nommé Gargantua', 'Nolan + Hans Zimmer'] },
  { file: 'silence_agneaux.jpg',       title: 'Le Silence des Agneaux',             year: 1991, indices: ['Une stagiaire FBI face à un génie criminel', 'Il mange ses victimes avec du chianti', 'Anthony Hopkins, masque inclus'] },
  { file: 'fight_club.jpg',            title: 'Fight Club',                          year: 1999, indices: ["La première règle : on n'en parle pas", 'Un homme insomnique se crée un alter ego', 'Brad Pitt et du savon'] },
  { file: 'parasite.jpg',              title: 'Parasite',                            year: 2019, indices: ["Une famille pauvre s'infiltre chez une famille riche", "Palme d'or et Oscar du meilleur film", 'La pierre porte-bonheur'] },
  { file: 'seigneur_anneaux.jpg',      title: 'Le Seigneur des Anneaux',            year: 2001, indices: ['Un hobbit doit détruire un anneau maléfique', 'La Terre du Milieu, les Orques, Gandalf', 'Peter Jackson, trilogie légendaire'] },
  { file: 'pulp_fiction.jpg',          title: 'Pulp Fiction',                        year: 1994, indices: ['Des histoires criminelles qui se croisent', 'La scène de danse et le Big Mac', 'Tarantino, Travolta, Uma Thurman'] },
  { file: 'dark_knight.jpg',           title: 'The Dark Knight',                    year: 2008, indices: ['Un super-héros face à un clown anarchiste', 'Pourquoi si sérieux ?', 'Heath Ledger dans le rôle de sa vie'] },
  { file: 'forrest_gump.jpg',          title: 'Forrest Gump',                        year: 1994, indices: ['La vie est comme une boîte de chocolats', "Il court à travers l'Amérique", 'Tom Hanks sur un banc'] },
  { file: 'gladiator.jpg',             title: 'Gladiator',                           year: 2000, indices: ['Un général romain trahi devient esclave', 'Êtes-vous diverti ?', 'Russell Crowe dans le Colisée'] },
  { file: 'shutter_island.jpg',        title: 'Shutter Island',                     year: 2010, indices: ["Un marshal enquête dans un asile sur une île", "On ne sait jamais si c'est réel", 'DiCaprio + Scorsese, twist final'] },
  { file: 'whiplash.jpg',              title: 'Whiplash',                            year: 2014, indices: ['Un batteur veut devenir le meilleur', 'Son prof est un tyran sadique', "Pas ta faute, c'est le tempo"] },
  { file: 'get_out.jpg',               title: 'Get Out',                             year: 2017, indices: ['Un homme noir rencontre la famille de sa copine blanche', 'Quelque chose cloche dans cette maison', 'Jordan Peele, horreur sociale'] },
  { file: 'everything_everywhere.jpg', title: 'Everything Everywhere All at Once',  year: 2022, indices: ['Une femme saute entre des univers parallèles', 'Des hot-dogs en guise de doigts', 'Michelle Yeoh, multivers et bagels'] },
]

function pad(n) { return String(n).padStart(2, '0') }

function getTimeLeft() {
  const diff = Math.max(0, new Date(DEADLINE) - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  }
}

const MAX_ESSAIS = 5

export default function Maintenance() {
  const [time, setTime] = useState({ days: 3, hours: 0, mins: 0, secs: 0 })
  const [film, setFilm] = useState(null)
  const [blur, setBlur] = useState(20)
  const [indiceIdx, setIndiceIdx] = useState(0)
  const [guess, setGuess] = useState('')
  const [essais, setEssais] = useState([])
  const [statut, setStatut] = useState('playing')
  const [showGame, setShowGame] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setTime(getTimeLeft())
    const interval = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  function startGame() {
    const f = FILMS[Math.floor(Math.random() * FILMS.length)]
    setFilm(f)
    setBlur(20)
    setIndiceIdx(0)
    setGuess('')
    setEssais([])
    setStatut('playing')
  }

  useEffect(() => {
    if (showGame && !film) startGame()
  }, [showGame])

  function soumettre() {
    const rep = guess.trim()
    if (!rep) return
    const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const correct = normalize(rep) === normalize(film.title)
    const newEssais = [...essais, { rep, correct }]
    setEssais(newEssais)
    setGuess('')
    if (correct) {
      setBlur(0)
      setStatut('win')
    } else if (newEssais.length >= MAX_ESSAIS) {
      setBlur(0)
      setStatut('lose')
    } else {
      setBlur(b => Math.max(0, b - 4))
      setIndiceIdx(i => Math.min(i + 1, film.indices.length - 1))
    }
    inputRef.current?.focus()
  }

  function handleKey(e) { if (e.key === 'Enter') soumettre() }

  const essaisRestants = MAX_ESSAIS - essais.length

  return (
    <>
      <Head>
        <title>CinéMarathon — Maintenance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="screen">
        <div className="bg-glow" />

        <div className="modal">
          <div className="neon-bar" />
          <div className="card">
            <div className="icon-ring" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className="kicker">Maintenance en cours</span>
            <h1 className="title">Site temporairement<br />indisponible</h1>
            <p className="subtitle">CinéMarathon</p>
            <div className="divider" />
            <p className="message">
              Nous sommes sincèrement navrés pour la gêne occasionnée.<br /><br />
              Suite à un <strong>blocage avec notre base de données</strong>, CinéMarathon est
              momentanément hors service. Vos données sont en sécurité —
              nous travaillons activement à rétablir le service dans les meilleurs délais.
            </p>
            <span className="countdown-label">Retour estimé dans</span>
            <div className="countdown">
              <div className="unit"><span className="unit-val">{pad(time.days)}</span><span className="unit-label">Jours</span></div>
              <span className="unit-sep">:</span>
              <div className="unit"><span className="unit-val">{pad(time.hours)}</span><span className="unit-label">Heures</span></div>
              <span className="unit-sep">:</span>
              <div className="unit"><span className="unit-val">{pad(time.mins)}</span><span className="unit-label">Min</span></div>
              <span className="unit-sep">:</span>
              <div className="unit"><span className="unit-val">{pad(time.secs)}</span><span className="unit-label">Sec</span></div>
            </div>
            <div className="neon-bar-bottom" />
            <p className="footer">Des questions ? Contacte-nous sur Discord ou par mail.</p>
            {!showGame && (
              <button className="btn-game" onClick={() => setShowGame(true)}>
                <div className="btn-game-inner">
                  <div className="btn-game-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="14" height="12" rx="2" />
                      <path d="M16 10l6-4v12l-6-4" />
                    </svg>
                  </div>
                  <div className="btn-game-text">
                    <span className="btn-game-label">Envie de passer le temps ?</span>
                    <span className="btn-game-sub">Cliquez pour jouer →</span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {showGame && film && (
          <div className="game-card">
            <div className="game-header">
              <span className="game-kicker">Mini-jeu</span>
              <h2 className="game-title">Devine le film</h2>
            </div>
            <div className="poster-wrap">
              <img
                src={"/posters/" + film.file}
                alt="Affiche mystère"
                className="poster"
                style={{ filter: "blur(" + blur + "px)", transition: 'filter 0.6s ease' }}
              />
              {statut === 'playing' && (
                <div className="poster-badge">{blur === 0 ? '👁️' : "Flou " + blur + "/20"}</div>
              )}
            </div>
            <div className="indices">
              {film.indices.slice(0, indiceIdx + 1).map((ind, i) => (
                <div key={i} className="indice">
                  <span className="indice-num">#{i + 1}</span>
                  <span>{ind}</span>
                </div>
              ))}
            </div>
            {essais.length > 0 && (
              <div className="essais-list">
                {essais.map((e, i) => (
                  <div key={i} className={"essai " + (e.correct ? 'correct' : 'wrong')}>
                    {e.correct ? '✓' : '✕'} {e.rep}
                  </div>
                ))}
              </div>
            )}
            {statut === 'playing' ? (
              <div className="game-input-row">
                <input
                  ref={inputRef}
                  className="game-input"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Nom du film..."
                  autoFocus
                />
                <button className="btn-submit" onClick={soumettre}>OK</button>
              </div>
            ) : (
              <div className={"result " + statut}>
                {statut === 'win'
                  ? "🎉 Bravo ! C'était bien " + film.title + " (" + film.year + ")"
                  : "💀 Raté ! C'était " + film.title + " (" + film.year + ")"}
                <button className="btn-rejouer" onClick={startGame}>Rejouer →</button>
              </div>
            )}
            {statut === 'playing' && (
              <p className="essais-restants">
                {essaisRestants} essai{essaisRestants > 1 ? 's' : ''} restant{essaisRestants > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #050505; min-height: 100vh; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
      `}</style>

      <style jsx>{`
        .screen { min-height: 100vh; background: #050505; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; gap: 32px; position: relative; overflow: hidden; }
        .bg-glow { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 800px; height: 400px; background: radial-gradient(ellipse at 50% 0%, rgba(200,20,20,0.13) 0%, transparent 70%); pointer-events: none; z-index: 0; }
        .modal { width: 100%; max-width: 480px; position: relative; z-index: 1; }
        .neon-bar { width: 100%; height: 2px; background: #c81414; border-radius: 2px 2px 0 0; box-shadow: 0 0 6px 1px #c81414, 0 0 18px 4px rgba(200,20,20,0.6), 0 0 50px 10px rgba(200,20,20,0.25); animation: pulse-bar 2.8s ease-in-out infinite; }
        @keyframes pulse-bar { 0%,100% { box-shadow: 0 0 6px 1px #c81414, 0 0 18px 4px rgba(200,20,20,0.6), 0 0 50px 10px rgba(200,20,20,0.25); } 50% { box-shadow: 0 0 3px 1px #c81414, 0 0 10px 2px rgba(200,20,20,0.35), 0 0 28px 6px rgba(200,20,20,0.12); } }
        .card { background: #0a0a0a; border: 1px solid rgba(200,20,20,0.18); border-top: none; border-radius: 0 0 18px 18px; padding: 48px 44px 44px; display: flex; flex-direction: column; align-items: center; }
        .icon-ring { width: 58px; height: 58px; border-radius: 50%; border: 1px solid rgba(200,20,20,0.45); background: rgba(200,20,20,0.07); display: flex; align-items: center; justify-content: center; margin-bottom: 22px; animation: pulse-icon 2.8s ease-in-out infinite; }
        @keyframes pulse-icon { 0%,100% { box-shadow: 0 0 14px rgba(200,20,20,0.22); } 50% { box-shadow: 0 0 6px rgba(200,20,20,0.1); } }
        .icon-ring svg { width: 24px; height: 24px; stroke: #c81414; }
        .kicker { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: #c81414; text-shadow: 0 0 10px rgba(200,20,20,0.5); margin-bottom: 14px; display: block; }
        .title { font-family: 'Playfair Display', serif; font-size: 30px; font-weight: 900; color: #f0ead6; text-align: center; line-height: 1.25; letter-spacing: 1px; margin-bottom: 8px; }
        .subtitle { font-size: 11px; color: #3a3a38; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 32px; }
        .divider { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,20,20,0.3), transparent); margin-bottom: 32px; }
        .message { font-size: 14px; color: #9b9080; line-height: 1.8; text-align: center; margin-bottom: 38px; }
        .message strong { color: #f0ead6; font-weight: 700; }
        .countdown-label { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #5f5e5a; margin-bottom: 18px; }
        .countdown { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 38px; }
        .unit { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .unit-val { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; color: #c81414; line-height: 1; min-width: 72px; text-align: center; text-shadow: 0 0 10px rgba(200,20,20,0.5), 0 0 28px rgba(200,20,20,0.25); animation: pulse-num 2.8s ease-in-out infinite; }
        @keyframes pulse-num { 0%,100% { text-shadow: 0 0 10px rgba(200,20,20,0.5), 0 0 28px rgba(200,20,20,0.25); } 50% { text-shadow: 0 0 5px rgba(200,20,20,0.25), 0 0 14px rgba(200,20,20,0.1); } }
        .unit-sep { font-family: 'Playfair Display', serif; font-size: 40px; color: rgba(200,20,20,0.25); line-height: 1; padding-top: 4px; }
        .unit-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #3a3a38; }
        .neon-bar-bottom { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,20,20,0.25), transparent); margin-bottom: 28px; }
        .footer { font-size: 12px; color: #3a3a38; text-align: center; margin-bottom: 28px; }
        .btn-game { background: transparent; border: 1px solid rgba(201,168,76,0.25); border-radius: 14px; padding: 16px 20px; cursor: pointer; width: 100%; font-family: 'DM Sans', sans-serif; transition: all 0.25s; }
        .btn-game:hover { background: rgba(201,168,76,0.06); border-color: rgba(201,168,76,0.5); }
        .btn-game-inner { display: flex; align-items: center; gap: 16px; }
        .btn-game-icon { width: 44px; height: 44px; min-width: 44px; border-radius: 50%; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); display: flex; align-items: center; justify-content: center; transition: all 0.25s; }
        .btn-game:hover .btn-game-icon { background: rgba(201,168,76,0.18); border-color: #C9A84C; }
        .btn-game-icon svg { width: 20px; height: 20px; stroke: #C9A84C; }
        .btn-game-text { display: flex; flex-direction: column; gap: 3px; text-align: left; }
        .btn-game-label { font-size: 14px; font-weight: 700; color: #f0ead6; }
        .btn-game-sub { font-size: 12px; color: #C9A84C; letter-spacing: 0.5px; }
        .game-card { width: 100%; max-width: 480px; background: #0a0a0a; border: 1px solid rgba(201,168,76,0.15); border-radius: 18px; padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 20px; position: relative; z-index: 1; }
        .game-header { text-align: center; }
        .game-kicker { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: #C9A84C; display: block; margin-bottom: 6px; }
        .game-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900; color: #f0ead6; }
        .poster-wrap { width: 180px; position: relative; border-radius: 10px; overflow: hidden; border: 1px solid rgba(201,168,76,0.2); }
        .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
        .poster-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.75); color: #9b9080; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 1px; }
        .indices { width: 100%; display: flex; flex-direction: column; gap: 8px; }
        .indice { display: flex; align-items: flex-start; gap: 10px; background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #9b9080; line-height: 1.5; animation: fade-in 0.4s ease; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .indice-num { color: #C9A84C; font-size: 11px; font-weight: 700; min-width: 20px; padding-top: 1px; }
        .essais-list { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .essai { padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid; }
        .essai.correct { background: rgba(82,196,122,0.1); border-color: rgba(82,196,122,0.3); color: #52c47a; }
        .essai.wrong { background: rgba(200,20,20,0.07); border-color: rgba(200,20,20,0.2); color: #9b9080; text-decoration: line-through; }
        .game-input-row { display: flex; gap: 10px; width: 100%; }
        .game-input { flex: 1; background: #111; border: 1px solid rgba(201,168,76,0.2); border-radius: 10px; padding: 12px 16px; color: #f0ead6; font-size: 14px; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color 0.2s; }
        .game-input:focus { border-color: #C9A84C; }
        .btn-submit { background: #C9A84C; border: none; color: #000; border-radius: 10px; padding: 12px 20px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .btn-submit:hover { background: #E8C87A; }
        .essais-restants { font-size: 12px; color: #5f5e5a; }
        .result { width: 100%; padding: 18px; border-radius: 12px; text-align: center; font-size: 14px; font-weight: 700; line-height: 1.6; display: flex; flex-direction: column; gap: 14px; align-items: center; }
        .result.win { background: rgba(82,196,122,0.08); border: 1px solid rgba(82,196,122,0.3); color: #52c47a; }
        .result.lose { background: rgba(200,20,20,0.07); border: 1px solid rgba(200,20,20,0.2); color: #e03030; }
        .btn-rejouer { background: transparent; border: 1px solid rgba(201,168,76,0.4); color: #C9A84C; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .btn-rejouer:hover { background: rgba(201,168,76,0.08); border-color: #C9A84C; }
        @media (max-width: 520px) {
          .card { padding: 36px 24px 32px; }
          .title { font-size: 24px; }
          .unit-val { font-size: 36px; min-width: 54px; }
          .game-card { padding: 24px 18px; }
        }
      `}</style>
    </>
  )
}
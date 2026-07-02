import { formatDate } from '../../utils/format'

/**
 * Hero du dashboard : identité du marathon en grand format cinématique.
 * Le backdrop provient du premier titre avec image (TMDB), sinon dégradé.
 */
export default function HeroCard({ room, progress, memberCount, watchlist }) {
  const backdrop = watchlist.find(item => item.backdrop)?.backdrop
    || watchlist.find(item => item.poster)?.poster
    || ''

  return (
    <section className="hero anim-up">
      {backdrop && <div className="hero-backdrop" style={{ backgroundImage: `url(${backdrop})` }} />}
      <div className="hero-scrim" />
      <div className="hero-content">
        <span className="kicker">Marathon en cours</span>
        <h1 className="hero-title">{room.name}</h1>
        <p className="hero-desc">
          {progress.total > 0
            ? `${progress.total} titres au programme. ${progress.seen} déjà visionnés en groupe — le marathon continue.`
            : 'La liste est vide pour le moment. Ajoutez vos premiers titres pour lancer le marathon.'}
        </p>
        <div className="hero-meta">
          {memberCount > 0 && (
            <div className="hero-meta-item"><b>{memberCount}</b><span>Membre{memberCount > 1 ? 's' : ''}</span></div>
          )}
          <div className="hero-meta-item"><b>{progress.films}</b><span>Films</span></div>
          <div className="hero-meta-item"><b>{progress.series}</b><span>Séries</span></div>
          {progress.animes > 0 && (
            <div className="hero-meta-item"><b>{progress.animes}</b><span>Animes</span></div>
          )}
          {room.created_at && (
            <div className="hero-meta-item"><b>{formatDate(room.created_at)}</b><span>Créé le</span></div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Section de présentation publique, rendue côté serveur : c'est ELLE que
 * Google indexe (l'application derrière le login est invisible pour lui).
 * Les mots-clés cibles y figurent naturellement : marathon de films,
 * soirée ciné entre amis, marathon Marvel, ordre chronologique...
 */
export default function SeoLanding() {
  return (
    <section className="seo-landing">
      <h2>Organisez vos marathons de films entre amis</h2>
      <p>
        Cinémarathon est le site gratuit pour organiser un <strong>marathon de films
        entre amis</strong> : créez votre salle privée, ajoutez vos films et séries,
        suivez votre progression ensemble et transformez chaque <strong>soirée ciné</strong> en
        événement.
      </p>

      <div className="seo-features">
        <div>
          <h3>🎬 Votre liste, votre ordre</h3>
          <p>
            Marathon <strong>Marvel en ordre chronologique</strong>, saga Harry Potter,
            trilogies cultes ou pire nanars : composez votre liste, les affiches,
            synopsis et durées se remplissent automatiquement.
          </p>
        </div>
        <div>
          <h3>🗳️ Votez pour la prochaine séance</h3>
          <p>
            L'admin propose des films, tout le monde vote, résultats en direct —
            et en cas d'égalité, le sort décide de façon mémorable.
          </p>
        </div>
        <div>
          <h3>⭐ Notes, discussions et classement</h3>
          <p>
            Notez chaque film, débattez des théories, gagnez de l'XP et des badges.
            Le calendrier trouve le créneau où tout le monde est dispo.
          </p>
        </div>
      </div>

      <p className="seo-cta">
        Créez votre compte gratuitement et lancez votre premier <strong>marathon ciné entre amis</strong> —
        ou consultez notre <a href="/ordre-marvel">ordre chronologique des films Marvel</a> pour
        préparer votre marathon MCU.
      </p>

      <p className="seo-footer-links">
        <a href="/mentions-legales">Mentions légales</a> ·{' '}
        <a href="/confidentialite">Confidentialité</a> ·{' '}
        <a href="/cgu">CGU</a>
      </p>
    </section>
  )
}

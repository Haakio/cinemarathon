import Head from 'next/head'

/**
 * Page SEO ciblant "site marathon marvel" / "organiser marathon marvel" —
 * complémentaire à /ordre-marvel (qui cible spécifiquement la liste d'ordre).
 * Ici l'angle est "comment organiser", avec renvoi vers l'appli.
 */
export default function MarathonMarvel() {
  return (
    <>
      <Head>
        <title>Organiser un marathon Marvel (MCU) entre amis — Cinémarathon</title>
        <meta
          name="description"
          content="Envie de faire un marathon Marvel entre amis ? Créez votre salle gratuite, choisissez l'ordre chronologique ou l'ordre MCU officiel, votez, notez chaque film et suivez votre progression ensemble."
        />
        <meta property="og:title" content="Organiser un marathon Marvel entre amis" />
        <meta property="og:description" content="Le site gratuit pour organiser votre marathon Marvel : ordre chronologique ou MCU, votes, notes, calendrier de dispos." />
        <link rel="canonical" href="https://xn--cinmarathon-dbb.com/marathon-marvel" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'Organiser un marathon Marvel entre amis',
          step: [
            { '@type': 'HowToStep', name: 'Choisir l\'ordre', text: 'Ordre chronologique (l\'histoire du MCU) ou ordre MCU officiel (uniquement les 35 films canon) : Cinémarathon bascule de l\'un à l\'autre en un clic.' },
            { '@type': 'HowToStep', name: 'Importer les films', text: 'Créez votre salle et ajoutez les films Marvel : affiches, synopsis et durées se remplissent automatiquement.' },
            { '@type': 'HowToStep', name: 'Caler les disponibilités', text: 'Le calendrier partagé trouve le créneau où tout le groupe est libre pour la prochaine séance.' },
            { '@type': 'HowToStep', name: 'Voter et regarder', text: 'En cas d\'hésitation sur le prochain film, lancez un vote ; suivez ensuite la progression du marathon ensemble.' },
            { '@type': 'HowToStep', name: 'Noter et débattre', text: 'Après chaque film, notez-le et commentez avec le groupe dans les discussions.' },
          ],
        }) }} />
      </Head>

      <main className="seo-page legal-page">
        <a className="seo-page-brand" href="/">🎬 Cinémarathon</a>
        <h1>Comment organiser un marathon Marvel entre amis</h1>
        <p className="seo-page-intro">
          35 films, une décennie et demie d'univers connecté : un <strong>marathon Marvel</strong> est
          un projet à part entière. Voici comment l'organiser sans que ça tourne au bazar de
          groupe WhatsApp.
        </p>

        <section>
          <h2>1. Choisir son ordre : chronologique ou MCU officiel</h2>
          <p>
            Deux écoles s'affrontent : l'<strong>ordre chronologique</strong> (l'histoire, de 1943 à
            aujourd'hui) et l'ordre de sortie (comme découvert au cinéma). Sur Cinémarathon, un bouton
            « MCU (chrono) » bascule automatiquement toute la salle — liste ET séance « Regarder » —
            sur les 35 films canon dans l'ordre officiel, sans toucher à votre liste complète. Voir le
            détail sur notre page <a href="/ordre-marvel">ordre chronologique des films Marvel</a>.
          </p>
        </section>

        <section>
          <h2>2. Créer une salle et importer les films</h2>
          <p>
            Créez une salle privée (avec code d'accès) ou rejoignez une salle publique. Ajoutez vos
            films et séries Marvel : affiches, synopsis, durées et date de sortie se remplissent
            automatiquement grâce à TMDB.
          </p>
        </section>

        <section>
          <h2>3. Caler un créneau où tout le monde est dispo</h2>
          <p>
            Fini les sondages Doodle : le calendrier partagé de Cinémarathon permet à chacun d'indiquer
            ses disponibilités, et affiche directement le créneau où le groupe est au complet.
          </p>
        </section>

        <section>
          <h2>4. Voter en cas d'hésitation</h2>
          <p>
            Plusieurs films en tête de liste et personne ne se décide ? Lancez un vote : chacun choisit
            son favori, résultat en direct, et le sort tranche en cas d'égalité.
          </p>
        </section>

        <section>
          <h2>5. Noter chaque film et suivre la progression</h2>
          <p>
            Après chaque séance, notez le film et laissez un commentaire. La progression du marathon
            (X / 35 films vus) se met à jour pour tout le groupe, et un classement compare qui a le
            plus « avancé ».
          </p>
        </section>

        <section className="seo-page-cta">
          <h2>Lancez votre marathon Marvel maintenant</h2>
          <p>
            Gratuit, sans publicité : créez votre salle en une minute et invitez vos amis.
          </p>
          <a className="btn-play" href="/">Créer mon marathon Marvel</a>
        </section>
      </main>
    </>
  )
}

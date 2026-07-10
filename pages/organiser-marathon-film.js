import Head from 'next/head'

/**
 * Page SEO ciblant "site pour organiser un marathon film" / "comment
 * organiser un marathon de films entre amis" — guide général (toutes
 * franchises), complémentaire aux pages dédiées Marvel.
 */
export default function OrganiserMarathonFilm() {
  return (
    <>
      <Head>
        <title>Comment organiser un marathon de films entre amis — Guide gratuit | Cinémarathon</title>
        <meta
          name="description"
          content="Le guide complet pour organiser un marathon de films, séries ou animes entre amis : choisir sa liste, caler les dispos, voter, suivre sa progression. Gratuit avec Cinémarathon."
        />
        <meta property="og:title" content="Comment organiser un marathon de films entre amis" />
        <meta property="og:description" content="Le site gratuit pour organiser un marathon de films entre amis, quelle que soit la saga : listes, votes, calendrier, notes." />
        <link rel="canonical" href="https://xn--cinmarathon-dbb.com/organiser-marathon-film" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'Organiser un marathon de films entre amis',
          step: [
            { '@type': 'HowToStep', name: 'Choisir un thème', text: 'Une saga (Marvel, Harry Potter, Star Wars...), un genre, ou simplement votre pile de films à voir : définissez le fil rouge de votre marathon.' },
            { '@type': 'HowToStep', name: 'Construire la liste', text: 'Créez une salle et ajoutez vos titres ; affiches, synopsis et durées se remplissent automatiquement.' },
            { '@type': 'HowToStep', name: 'Choisir un ordre', text: 'Ordre chronologique de l\'histoire, ordre de sortie, ou ordre libre selon vos envies.' },
            { '@type': 'HowToStep', name: 'Caler les disponibilités', text: 'Utilisez un calendrier partagé pour trouver le créneau où tout le groupe est libre.' },
            { '@type': 'HowToStep', name: 'Voter en cas d\'hésitation', text: 'Proposez plusieurs films et laissez le groupe voter pour le prochain.' },
            { '@type': 'HowToStep', name: 'Suivre, noter, débattre', text: 'Marquez chaque titre comme vu, notez-le, et discutez-en avec le groupe.' },
          ],
        }) }} />
      </Head>

      <main className="seo-page legal-page">
        <a className="seo-page-brand" href="/">🎬 Cinémarathon</a>
        <h1>Comment organiser un marathon de films entre amis</h1>
        <p className="seo-page-intro">
          Un <strong>marathon de films entre amis</strong> — que ce soit une saga entière ou une
          simple pile de films à rattraper — se prépare un minimum pour éviter le éternel
          « on regarde quoi ce soir ? ». Voici la méthode, et comment un site dédié comme
          Cinémarathon simplifie chaque étape.
        </p>

        <section>
          <h2>1. Choisir votre thème ou votre saga</h2>
          <p>
            Marathon <strong>Marvel</strong>, saga Harry Potter, trilogie Le Seigneur des Anneaux,
            festival de nanars, ou simplement votre backlog de films à voir : définissez le fil rouge.
            C'est ce qui donne envie de revenir semaine après semaine.
          </p>
        </section>

        <section>
          <h2>2. Construire votre liste (et choisir un ordre)</h2>
          <p>
            Listez les films et séries à regarder. Selon la saga, vous pouvez suivre l'ordre
            chronologique de l'histoire, l'ordre de sortie, ou votre propre ordre. Sur Cinémarathon,
            ajouter un titre remplit automatiquement l'affiche, le synopsis, la durée et l'année.
          </p>
        </section>

        <section>
          <h2>3. Trouver un créneau où tout le monde est disponible</h2>
          <p>
            Le point qui fait le plus souvent capoter un marathon : caler un horaire à plusieurs.
            Un calendrier de disponibilités partagé (chacun coche ses créneaux libres) évite les
            allers-retours interminables sur le groupe de discussion.
          </p>
        </section>

        <section>
          <h2>4. Voter pour le prochain film</h2>
          <p>
            Quand plusieurs titres se disputent la place, un vote de groupe (avec égalité tranchée
            au sort) évite que ce soit toujours la même personne qui décide.
          </p>
        </section>

        <section>
          <h2>5. Suivre la progression, noter, débattre</h2>
          <p>
            Marquer les titres vus, noter chacun d'eux et en discuter ensemble transforme une
            simple liste en vrai marathon collectif — avec classement et badges pour pimenter
            un peu la compétition amicale.
          </p>
        </section>

        <section className="seo-page-cta">
          <h2>Créez votre marathon gratuitement</h2>
          <p>
            Cinémarathon réunit tout ça — liste, ordre, calendrier, votes, notes, chat — dans un
            seul site gratuit, sans publicité.
          </p>
          <a className="btn-play" href="/">Créer mon marathon</a>
          <p className="seo-footer-links">
            Marathon Marvel ? Voir notre guide dédié : <a href="/marathon-marvel">organiser un marathon Marvel entre amis</a>
            {' '}et <a href="/ordre-marvel">l'ordre chronologique des films Marvel</a>.
          </p>
        </section>
      </main>
    </>
  )
}

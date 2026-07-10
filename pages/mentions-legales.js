import Head from 'next/head'

/**
 * Mentions légales (obligation LCEN, art. 6-III). Éditeur particulier :
 * l'identité complète est communiquée à l'hébergeur, qui peut la transmettre
 * sur décision de justice — pas d'obligation d'afficher une adresse postale.
 */
export default function MentionsLegales() {
  return (
    <>
      <Head>
        <title>Mentions légales — Cinémarathon</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="seo-page legal-page">
        <a className="seo-page-brand" href="/">🎬 Cinémarathon</a>
        <h1>Mentions légales</h1>
        <p className="seo-page-intro">Dernière mise à jour : 10 juillet 2026</p>

        <section>
          <h2>Éditeur du site</h2>
          <p>
            Le site Cinémarathon (xn--cinmarathon-dbb.com / cinémarathon.com) est édité,
            à titre non professionnel et non lucratif, par Mathéo Leblois, particulier.
          </p>
          <p>
            Conformément à la loi n°2004-575 du 21 juin 2004 pour la confiance dans
            l'économie numérique, l'éditeur étant une personne physique n'agissant pas
            à titre professionnel, son adresse personnelle n'est pas rendue publique.
            Elle est communiquée à l'hébergeur et ne peut être transmise à des tiers
            que sur décision de justice.
          </p>
          <p>Contact : <a href="mailto:contact@xn--cinmarathon-dbb.com">contact@xn--cinmarathon-dbb.com</a></p>
        </section>

        <section>
          <h2>Directeur de la publication</h2>
          <p>Mathéo Leblois.</p>
        </section>

        <section>
          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par Vercel Inc. Les informations complètes de
            l'hébergeur (raison sociale, adresse) sont disponibles sur{' '}
            <a href="https://vercel.com/legal" target="_blank" rel="noopener noreferrer">vercel.com/legal</a>.
          </p>
          <p>
            La base de données (comptes, avis, messages...) est hébergée via Vercel
            Postgres, dont l'infrastructure technique est fournie par Neon, Inc.
          </p>
        </section>

        <section>
          <h2>Propriété intellectuelle</h2>
          <p>
            La structure du site, son design et son code sont la propriété de
            l'éditeur. Les affiches, synopsis et informations de films/séries
            affichés proviennent de l'API publique The Movie Database (TMDB) et
            restent la propriété de leurs ayants droit respectifs. Cinémarathon
            n'est affilié à aucun studio, plateforme de streaming ou ayant droit.
          </p>
        </section>

        <section>
          <h2>Contenu publié par les utilisateurs</h2>
          <p>
            Les avis, commentaires, messages de discussion et publications
            (« posts ») sont rédigés par les utilisateurs du site, sous leur
            propre responsabilité. L'éditeur agit en tant qu'hébergeur de ce
            contenu au sens de l'article 6 de la LCEN : tout contenu manifestement
            illicite peut être signalé à <a href="mailto:contact@xn--cinmarathon-dbb.com">contact@xn--cinmarathon-dbb.com</a>{' '}
            et sera retiré dans les meilleurs délais. Un système de modération et
            de signalement est également disponible directement dans l'application.
          </p>
        </section>

        <section>
          <h2>Soutien volontaire (dons)</h2>
          <p>
            Le site propose un lien vers une page Ko-fi permettant de soutenir
            financièrement, de façon libre et volontaire, le développement du
            site. Il ne s'agit ni d'un achat, ni d'un abonnement : aucune
            contrepartie n'est due en échange d'un don.
          </p>
        </section>

        <section>
          <h2>Droit applicable</h2>
          <p>Le présent site est soumis au droit français.</p>
        </section>

        <p className="legal-links">
          Voir aussi : <a href="/confidentialite">Politique de confidentialité</a> ·{' '}
          <a href="/cgu">Conditions générales d'utilisation</a>
        </p>
      </main>
    </>
  )
}

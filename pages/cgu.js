import Head from 'next/head'

/**
 * Conditions générales d'utilisation.
 */
export default function CGU() {
  return (
    <>
      <Head>
        <title>Conditions générales d'utilisation — Cinémarathon</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="seo-page legal-page">
        <a className="seo-page-brand" href="/">🎬 Cinémarathon</a>
        <h1>Conditions générales d'utilisation</h1>
        <p className="seo-page-intro">Dernière mise à jour : 10 juillet 2026</p>

        <section>
          <h2>Objet</h2>
          <p>
            Cinémarathon est un service gratuit permettant d'organiser des
            marathons de films, séries et animes entre amis (listes, notes,
            votes, discussions, calendrier). L'utilisation du site implique
            l'acceptation pleine et entière des présentes conditions.
          </p>
        </section>

        <section>
          <h2>Âge minimum et inscription</h2>
          <p>
            L'inscription est réservée aux personnes âgées d'au moins 15 ans.
            En créant un compte, vous certifiez avoir au moins 15 ans. Vous êtes
            responsable de la confidentialité de votre mot de passe et de toute
            activité effectuée depuis votre compte.
          </p>
        </section>

        <section>
          <h2>Contenu publié par les utilisateurs</h2>
          <p>
            Vous restez seul responsable des avis, commentaires, messages et
            publications que vous postez. Sont notamment interdits : les propos
            haineux, discriminatoires, harcelants ou illicites, l'usurpation
            d'identité, le spam, et toute atteinte aux droits de tiers.
          </p>
          <p>
            L'équipe de modération (administrateur et modérateurs désignés)
            peut supprimer tout contenu contrevenant à ces règles, avertir,
            bloquer temporairement ou bannir un compte, sans préavis en cas de
            manquement grave.
          </p>
        </section>

        <section>
          <h2>Suppression de compte</h2>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis Profil →
            Paramètres. Cette suppression est définitive et entraîne l'effacement
            de vos données personnelles, notes, messages, amitiés et rooms
            privées que vous avez créées.
          </p>
        </section>

        <section>
          <h2>Soutien volontaire (dons)</h2>
          <p>
            Un lien vers une page Ko-fi permet de soutenir financièrement le
            développement du site, de façon totalement libre et volontaire.
            Aucune fonctionnalité du site n'est réservée aux personnes ayant
            fait un don, et aucune contrepartie n'est due.
          </p>
        </section>

        <section>
          <h2>Disponibilité du service</h2>
          <p>
            Le site est fourni « en l'état », sans garantie de disponibilité
            continue. L'éditeur peut faire évoluer, suspendre ou arrêter le
            service à tout moment, notamment pour maintenance.
          </p>
        </section>

        <section>
          <h2>Droit applicable et contact</h2>
          <p>
            Les présentes conditions sont soumises au droit français. Pour toute
            question : <a href="mailto:contact@xn--cinmarathon-dbb.com">contact@xn--cinmarathon-dbb.com</a>
          </p>
        </section>

        <p className="legal-links">
          Voir aussi : <a href="/mentions-legales">Mentions légales</a> ·{' '}
          <a href="/confidentialite">Politique de confidentialité</a>
        </p>
      </main>
    </>
  )
}

import Head from 'next/head'

/**
 * Politique de confidentialité (RGPD). Reflète les données réellement
 * collectées par lib/db.js — à tenir à jour si le schéma évolue.
 */
export default function Confidentialite() {
  return (
    <>
      <Head>
        <title>Politique de confidentialité — Cinémarathon</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="seo-page legal-page">
        <a className="seo-page-brand" href="/">🎬 Cinémarathon</a>
        <h1>Politique de confidentialité</h1>
        <p className="seo-page-intro">Dernière mise à jour : 10 juillet 2026</p>

        <section>
          <h2>Qui est responsable de vos données ?</h2>
          <p>
            Mathéo Leblois, éditeur du site Cinémarathon (voir les{' '}
            <a href="/mentions-legales">mentions légales</a>), est responsable du
            traitement au sens du RGPD. Pour toute question ou demande relative à
            vos données, contactez : <a href="mailto:contact@xn--cinmarathon-dbb.com">contact@xn--cinmarathon-dbb.com</a>
          </p>
        </section>

        <section>
          <h2>Données collectées</h2>
          <ul>
            <li><strong>Compte</strong> : pseudo, mot de passe (stocké haché, jamais en clair), date de création.</li>
            <li><strong>Profil</strong> : avatar (emoji, couleur, ou image que vous importez), tag optionnel.</li>
            <li><strong>Activité du marathon</strong> : films/séries ajoutés, notes et commentaires laissés, disponibilités renseignées, votes.</li>
            <li><strong>Discussions</strong> : messages de chat par salle, publications et réponses ("posts").</li>
            <li><strong>Relations sociales</strong> : liste d'amis et demandes d'amitié.</li>
            <li><strong>Modération</strong> : signalements, messages d'appel en cas de compte suspendu, motif de blocage éventuel.</li>
            <li><strong>Technique</strong> : adresse IP (utilisée uniquement pour la lutte contre les abus — bannissements, création de comptes multiples frauduleux), horodatage de dernière activité.</li>
            <li><strong>Retour utilisateur</strong> : si vous utilisez le formulaire de feedback, votre pseudo et votre message sont transmis à un salon Discord privé utilisé par l'éditeur pour le suivi (voir « Destinataires » ci-dessous).</li>
          </ul>
        </section>

        <section>
          <h2>Finalités et bases légales</h2>
          <ul>
            <li>Fournir le service (création de compte, marathons, notes, chat) — exécution du contrat / intérêt légitime.</li>
            <li>Sécurité et lutte contre les abus (bannissement, comptes multiples, contenu haineux) — intérêt légitime.</li>
            <li>Amélioration du site à partir de vos retours — consentement (formulaire de feedback, facultatif).</li>
          </ul>
        </section>

        <section>
          <h2>Destinataires de vos données</h2>
          <ul>
            <li><strong>Vercel Inc.</strong> — hébergement de l'application et de la base de données (Vercel Postgres, infrastructure Neon, Inc.).</li>
            <li><strong>Discord Inc.</strong> — uniquement si vous envoyez un message via le formulaire de feedback (transmis à un salon privé).</li>
            <li><strong>The Movie Database (TMDB)</strong> — utilisé côté serveur pour rechercher des informations sur les films/séries ; aucune donnée personnelle vous concernant ne lui est transmise.</li>
          </ul>
          <p>Aucune donnée n'est vendue ni utilisée à des fins publicitaires.</p>
        </section>

        <section>
          <h2>Durée de conservation</h2>
          <ul>
            <li>Données de compte et d'activité : conservées tant que votre compte existe, supprimées définitivement (avec toutes vos données associées) si vous supprimez votre compte ou en faites la demande.</li>
            <li>Adresses IP : conservées un maximum de 12 mois glissants à des fins de sécurité, sauf pour les comptes bannis où l'IP reste associée au bannissement tant que celui-ci est actif.</li>
          </ul>
        </section>

        <section>
          <h2>Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants sur vos données :</p>
          <ul>
            <li><strong>Accès et portabilité</strong> : téléchargez l'ensemble de vos données depuis Profil → Paramètres → « Télécharger mes données ».</li>
            <li><strong>Effacement</strong> : supprimez votre compte et toutes vos données à tout moment depuis Profil → Paramètres → « Supprimer mon compte ».</li>
            <li><strong>Rectification</strong> : modifiez votre profil directement dans l'application, ou contactez-nous pour toute autre correction.</li>
            <li><strong>Opposition / limitation</strong> : contactez-nous à l'adresse ci-dessus.</li>
            <li><strong>Réclamation</strong> : vous pouvez saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>) si vous estimez que vos droits ne sont pas respectés.</li>
          </ul>
        </section>

        <section>
          <h2>Stockage local (navigateur)</h2>
          <p>
            L'application utilise le stockage local de votre navigateur
            (<code>localStorage</code>) pour garder votre session ouverte et
            mémoriser certaines préférences (room courante, préférence de chat,
            réglages d'affichage). Ces données restent sur votre appareil et ne
            sont pas transmises à des tiers ; elles sont supprimées si vous videz
            le stockage de votre navigateur ou vous déconnectez.
          </p>
        </section>

        <p className="legal-links">
          Voir aussi : <a href="/mentions-legales">Mentions légales</a> ·{' '}
          <a href="/cgu">Conditions générales d'utilisation</a>
        </p>
      </main>
    </>
  )
}

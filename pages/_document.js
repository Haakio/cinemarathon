import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Document racine : langue française déclarée (SEO + accessibilité),
 * couleur de thème pour les navigateurs mobiles.
 */
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        <meta name="theme-color" content="#0A0A0A" />
        {/* Bascule sidebar/menu hamburger pilotée en JS (pas en @media) :
            un bug de Chrome fait que l'évaluation des @media peut rester
            calée sur l'ancienne largeur après un F5 quand DevTools est
            ancré sur le côté (qui réduit la largeur RÉELLE de la page).
            window.innerWidth, lui, reste fiable — donc on s'en sert
            directement pour poser la classe, sans dépendre du moteur CSS.
            Script synchrone dans <head> : s'applique avant la première
            peinture, aucun flash pour les utilisateurs normaux. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function () {
            function syncViewportClass() {
              document.documentElement.classList.toggle('narrow-viewport', window.innerWidth <= 860);
            }
            syncViewportClass();
            window.addEventListener('resize', syncViewportClass);
          })();
        ` }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

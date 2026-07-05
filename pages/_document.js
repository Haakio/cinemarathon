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
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

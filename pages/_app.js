import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Head from 'next/head'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import PrivacyBanner from '../components/widgets/PrivacyBanner'
import '../styles/globals.css'

// Polices auto-hébergées par Next (aucune requête vers fonts.googleapis.com
// au chargement : pas de transfert de données vers Google sans consentement).
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '700'], variable: '--font-body' })

// ─── MAINTENANCE ────────────────────────────────────────────
// Passe à true pour bloquer le site, false pour le rouvrir
const MAINTENANCE = false
// ────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    if (MAINTENANCE && router.pathname !== '/maintenance') {
      router.replace('/maintenance')
    }
    if (!MAINTENANCE && router.pathname === '/maintenance') {
      router.replace('/')
    }
  }, [router])

  if (MAINTENANCE && router.pathname !== '/maintenance') return null

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <div className={`${playfair.variable} ${dmSans.variable}`}>
        <Component {...pageProps} />
        <PrivacyBanner />
      </div>
    </>
  )
}

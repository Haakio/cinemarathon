import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Head from 'next/head'
import '../styles/globals.css'

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
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

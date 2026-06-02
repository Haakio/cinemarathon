import { useRouter } from 'next/router'
import { useEffect } from 'react'

// ─── MAINTENANCE ────────────────────────────────────────────
// Passe à true pour bloquer le site, false pour le rouvrir
const MAINTENANCE = true
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

  return <Component {...pageProps} />
}
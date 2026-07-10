import { useEffect, useState } from 'react'

/**
 * Bandeau d'information (pas un consentement bloquant : aucun traceur tiers
 * n'est utilisé) sur le stockage local du navigateur. Affiché une fois,
 * mémorisé via localStorage — la clé elle-même EST ce que le bandeau annonce.
 */
export default function PrivacyBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('cm_privacy_ack') !== '1') setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem('cm_privacy_ack', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="privacy-banner">
      <p>
        Cinémarathon utilise le stockage local de votre navigateur pour garder
        votre session ouverte et mémoriser vos préférences — pas de traceur
        publicitaire. En savoir plus dans notre{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>
      <button onClick={dismiss}>Compris</button>
    </div>
  )
}

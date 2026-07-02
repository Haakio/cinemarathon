import { useEffect, useState } from 'react'
import { initials, pseudoHue } from '../../utils/format'

/**
 * Avatar unifié, par ordre de priorité :
 * 1. Image / GIF (url) — avec fallback automatique si le lien est mort
 * 2. Emoji personnalisé
 * 3. Initiale du pseudo
 * Couleur personnalisée (hue) si définie, sinon teinte dérivée du pseudo.
 */
export default function Avatar({ pseudo, emoji = '', hue = null, url = '', size = 34, className = '' }) {
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => { setImgFailed(false) }, [url])

  const finalHue = hue ?? pseudoHue(pseudo)
  const showImage = url && !imgFailed

  return (
    <div
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: emoji ? size * 0.52 : size * 0.42,
        background: showImage
          ? 'var(--bg3)'
          : `linear-gradient(135deg, hsl(${finalHue}, 48%, 62%), hsl(${finalHue}, 52%, 38%))`,
      }}
    >
      {showImage ? (
        <img
          className="avatar-img"
          src={url}
          alt={pseudo || 'avatar'}
          onError={() => setImgFailed(true)}
        />
      ) : (
        emoji || initials(pseudo)
      )}
    </div>
  )
}

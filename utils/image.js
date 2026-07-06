/**
 * Helpers d'images côté navigateur (avatars, messages de discussion).
 * Zéro service de stockage : compression locale puis base64 en base,
 * ou URL directe (Tenor, Imgur...) pour garder les GIF animés.
 */

/** Lit un fichier en data URL (GIF conservés tels quels). */
export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Redimensionne une image côté navigateur (proportions conservées,
 * limitée à maxDim px) et la compresse en webp.
 */
export function downscaleImage(file, maxDim = 640, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/webp', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image illisible')) }
    img.src = objectUrl
  })
}

/**
 * Recadre en carré (cover) — utilisé pour les avatars.
 */
export function downscaleSquare(file, size = 128, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/webp', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image illisible')) }
    img.src = objectUrl
  })
}

/** Première URL d'image trouvée dans un texte (pour l'embed auto des GIF collés). */
export function extractImageUrl(text) {
  const match = String(text || '').match(/https:\/\/\S+\.(?:gif|png|jpe?g|webp)(?:\?\S*)?/i)
  return match ? match[0] : null
}

import { useEffect, useRef, useState } from 'react'
import Modal from '../modals/Modal'
import { JIMMY_CONFIG } from '../../utils/constants'

/**
 * Tie-break "Jimmy" : vidéo fond vert avec les deux posters incrustés
 * en chroma key (canvas, image par image). La vidéo jouée correspond au
 * gagnant DÉJÀ tiré au sort côté serveur — tout le monde voit pareil.
 * Fallback : roulette animée si la vidéo est absente.
 */
export default function JimmyPlayer({ leftItem, rightItem, winnerSide, onFinished, onClose }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const [mode, setMode] = useState('video') // 'video' | 'roulette'
  const [finished, setFinished] = useState(false)
  const [rouletteSide, setRouletteSide] = useState('left')

  const winnerItem = winnerSide === 'left' ? leftItem : rightItem
  const videoSrc = winnerSide === 'left' ? JIMMY_CONFIG.videoLeft : JIMMY_CONFIG.videoRight

  // Prévenir le parent quand le verdict est tombé (démasque le gagnant)
  useEffect(() => {
    if (finished) onFinished?.()
  }, [finished, onFinished])

  // ── Mode vidéo : chroma key ─────────────────────────────
  useEffect(() => {
    if (mode !== 'video') return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const posters = {}
    const loadPoster = (key, item) => {
      if (!item?.poster) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = item.poster
      img.onload = () => { posters[key] = img }
    }
    loadPoster('left', leftItem)
    loadPoster('right', rightItem)

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const work = document.createElement('canvas')
    const workCtx = work.getContext('2d', { willReadFrequently: true })
    let raf

    function zoneRect(zone, W, H) {
      return {
        x: Math.round((zone.x / 100) * W),
        y: Math.round((zone.y / 100) * H),
        w: Math.round((zone.w / 100) * W),
        h: Math.round((zone.h / 100) * H),
      }
    }

    function draw() {
      if (video.readyState >= 2) {
        const W = video.videoWidth
        const H = video.videoHeight
        if (W && H) {
          if (canvas.width !== W) { canvas.width = W; canvas.height = H; work.width = W; work.height = H }

          // 1. Frame vidéo brute
          workCtx.drawImage(video, 0, 0, W, H)

          // 2. Dans chaque zone de porte : les pixels verts deviennent transparents
          const { greenDominance, greenMin } = JIMMY_CONFIG
          for (const key of ['left', 'right']) {
            const rect = zoneRect(JIMMY_CONFIG.zones[key], W, H)
            const frame = workCtx.getImageData(rect.x, rect.y, rect.w, rect.h)
            const data = frame.data
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2]
              if (g > greenMin && g > r * greenDominance && g > b * greenDominance) {
                data[i + 3] = 0
              }
            }
            workCtx.putImageData(frame, rect.x, rect.y)
          }

          // 3. Posters dessous, vidéo détourée dessus
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, W, H)
          for (const key of ['left', 'right']) {
            const poster = posters[key]
            if (poster) {
              const rect = zoneRect(JIMMY_CONFIG.zones[key], W, H)
              ctx.drawImage(poster, rect.x, rect.y, rect.w, rect.h)
            }
          }
          ctx.drawImage(work, 0, 0)
        }
      }
      raf = requestAnimationFrame(draw)
    }

    const onError = () => setMode('roulette') // vidéo absente → fallback
    const onEnded = () => setFinished(true)
    video.addEventListener('error', onError)
    video.addEventListener('ended', onEnded)
    video.play().catch(() => { })
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('error', onError)
      video.removeEventListener('ended', onEnded)
    }
  }, [mode, leftItem, rightItem])

  // ── Mode roulette (fallback sans vidéo) ─────────────────
  useEffect(() => {
    if (mode !== 'roulette') return
    let count = 0
    const total = 14 + (winnerSide === 'right' ? 1 : 0) // finit du bon côté
    const timer = setInterval(() => {
      count += 1
      setRouletteSide(side => (side === 'left' ? 'right' : 'left'))
      if (count >= total) {
        clearInterval(timer)
        setRouletteSide(winnerSide)
        setFinished(true)
      }
    }, 220)
    return () => clearInterval(timer)
  }, [mode, winnerSide])

  return (
    <Modal onClose={onClose} className="jimmy-modal">
      <div className="modal-body" style={{ textAlign: 'center' }}>
        <span className="kicker">Égalité parfaite</span>
        <h2 className="display" style={{ fontSize: '24px', margin: '6px 0 16px' }}>Jimmy tranche.</h2>

        {mode === 'video' ? (
          <div className="jimmy-stage">
            <video ref={videoRef} src={videoSrc} playsInline muted style={{ display: 'none' }} />
            <canvas ref={canvasRef} className="jimmy-canvas" />
          </div>
        ) : (
          <div className="jimmy-roulette">
            {[['left', leftItem], ['right', rightItem]].map(([side, item]) => (
              <div key={side} className={`jimmy-choice ${rouletteSide === side ? 'lit' : ''} ${finished && winnerSide === side ? 'winner' : ''}`}>
                {item?.poster
                  ? <img src={item.poster} alt={item?.title} />
                  : <div className="jimmy-poster-ph">🎬</div>}
                <b>{item?.title}</b>
              </div>
            ))}
          </div>
        )}

        {finished && (
          <div className="jimmy-result">
            🏆 <b>{winnerItem?.title}</b> remporte le vote !
            <button className="btn-add" style={{ width: 'auto', padding: '10px 24px', marginTop: '14px' }} onClick={onClose}>
              C'est noté
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

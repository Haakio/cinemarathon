import AnimatedNumber from './AnimatedNumber'

/**
 * Anneau de progression SVG (dégradé doré, tracé animé).
 * @param {{percent: number, size?: number, label?: string}} props
 */
export default function ProgressRing({ percent, size = 130, label = 'complété' }) {
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent || 0))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-light)" />
            <stop offset="100%" stopColor="var(--gold-dark)" />
          </linearGradient>
        </defs>
        <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="progress-ring-fill"
          cx={size / 2} cy={size / 2} r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ '--ring-circ': circumference }}
        />
      </svg>
      <div className="progress-ring-label">
        <b><AnimatedNumber value={clamped} format={n => `${n}%`} /></b>
        <span>{label}</span>
      </div>
    </div>
  )
}

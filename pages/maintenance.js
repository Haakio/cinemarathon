import Head from 'next/head'
import { useState, useEffect } from 'react'

const DEADLINE = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

function pad(n) { return String(n).padStart(2, '0') }

function getTimeLeft() {
  const diff = Math.max(0, new Date(DEADLINE) - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  }
}

export default function Maintenance() {
  const [time, setTime] = useState({ days: 3, hours: 0, mins: 0, secs: 0 })

  useEffect(() => {
    setTime(getTimeLeft())
    const interval = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Head>
        <title>CinéMarathon — Maintenance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="screen">
        <div className="bg-glow" />

        <div className="modal">
          <div className="neon-bar" />

          <div className="card">
            <div className="icon-ring" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <span className="kicker">Maintenance en cours</span>
            <h1 className="title">Site temporairement<br />indisponible</h1>
            <p className="subtitle">CinéMarathon</p>

            <div className="divider" />

            <p className="message">
              Nous sommes sincèrement navrés pour la gêne occasionnée.<br /><br />
              Suite à un <strong>blocage avec notre base de données</strong>, CinéMarathon est
              momentanément hors service. Vos données sont en sécurité —
              nous travaillons activement à rétablir le service dans les meilleurs délais.
            </p>

            <span className="countdown-label">Retour estimé dans</span>
            <div className="countdown">
              <div className="unit">
                <span className="unit-val">{pad(time.days)}</span>
                <span className="unit-label">Jours</span>
              </div>
              <span className="unit-sep">:</span>
              <div className="unit">
                <span className="unit-val">{pad(time.hours)}</span>
                <span className="unit-label">Heures</span>
              </div>
              <span className="unit-sep">:</span>
              <div className="unit">
                <span className="unit-val">{pad(time.mins)}</span>
                <span className="unit-label">Min</span>
              </div>
              <span className="unit-sep">:</span>
              <div className="unit">
                <span className="unit-val">{pad(time.secs)}</span>
                <span className="unit-label">Sec</span>
              </div>
            </div>

            <div className="neon-bar-bottom" />

            <p className="footer">
              Des questions ? Contacte-nous sur Discord ou par mail.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          background: #050505;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }
      `}</style>

      <style jsx>{`
        .screen {
          min-height: 100vh;
          background: #050505;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .bg-glow {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 400px;
          background: radial-gradient(ellipse at 50% 0%, rgba(200,20,20,0.13) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .modal {
          width: 100%;
          max-width: 480px;
          position: relative;
          z-index: 1;
        }

        .neon-bar {
          width: 100%;
          height: 2px;
          background: #c81414;
          border-radius: 2px 2px 0 0;
          box-shadow:
            0 0 6px 1px #c81414,
            0 0 18px 4px rgba(200,20,20,0.6),
            0 0 50px 10px rgba(200,20,20,0.25);
          animation: pulse-bar 2.8s ease-in-out infinite;
        }

        @keyframes pulse-bar {
          0%, 100% {
            box-shadow: 0 0 6px 1px #c81414, 0 0 18px 4px rgba(200,20,20,0.6), 0 0 50px 10px rgba(200,20,20,0.25);
          }
          50% {
            box-shadow: 0 0 3px 1px #c81414, 0 0 10px 2px rgba(200,20,20,0.35), 0 0 28px 6px rgba(200,20,20,0.12);
          }
        }

        .card {
          background: #0a0a0a;
          border: 1px solid rgba(200,20,20,0.18);
          border-top: none;
          border-radius: 0 0 18px 18px;
          padding: 48px 44px 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .icon-ring {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 1px solid rgba(200,20,20,0.45);
          background: rgba(200,20,20,0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          animation: pulse-icon 2.8s ease-in-out infinite;
        }

        @keyframes pulse-icon {
          0%, 100% { box-shadow: 0 0 14px rgba(200,20,20,0.22); }
          50% { box-shadow: 0 0 6px rgba(200,20,20,0.1); }
        }

        .icon-ring svg {
          width: 24px;
          height: 24px;
          stroke: #c81414;
        }

        .kicker {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 4px;
          color: #c81414;
          text-shadow: 0 0 10px rgba(200,20,20,0.5);
          margin-bottom: 14px;
          display: block;
        }

        .title {
          font-family: 'Playfair Display', serif;
          font-size: 30px;
          font-weight: 900;
          color: #f0ead6;
          text-align: center;
          line-height: 1.25;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 11px;
          color: #3a3a38;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 32px;
        }

        .divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,20,20,0.3), transparent);
          margin-bottom: 32px;
        }

        .message {
          font-size: 14px;
          color: #9b9080;
          line-height: 1.8;
          text-align: center;
          margin-bottom: 38px;
        }

        .message strong {
          color: #f0ead6;
          font-weight: 700;
        }

        .countdown-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #5f5e5a;
          margin-bottom: 18px;
        }

        .countdown {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 38px;
        }

        .unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .unit-val {
          font-family: 'Playfair Display', serif;
          font-size: 48px;
          font-weight: 900;
          color: #c81414;
          line-height: 1;
          min-width: 72px;
          text-align: center;
          text-shadow:
            0 0 10px rgba(200,20,20,0.5),
            0 0 28px rgba(200,20,20,0.25);
          animation: pulse-num 2.8s ease-in-out infinite;
        }

        @keyframes pulse-num {
          0%, 100% { text-shadow: 0 0 10px rgba(200,20,20,0.5), 0 0 28px rgba(200,20,20,0.25); }
          50% { text-shadow: 0 0 5px rgba(200,20,20,0.25), 0 0 14px rgba(200,20,20,0.1); }
        }

        .unit-sep {
          font-family: 'Playfair Display', serif;
          font-size: 40px;
          color: rgba(200,20,20,0.25);
          line-height: 1;
          padding-top: 4px;
        }

        .unit-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #3a3a38;
        }

        .neon-bar-bottom {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,20,20,0.25), transparent);
          margin-bottom: 28px;
        }

        .footer {
          font-size: 12px;
          color: #3a3a38;
          text-align: center;
        }

        @media (max-width: 520px) {
          .card { padding: 36px 24px 32px; }
          .title { font-size: 24px; }
          .unit-val { font-size: 36px; min-width: 54px; }
        }
      `}</style>
    </>
  )
}

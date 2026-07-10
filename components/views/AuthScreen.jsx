import { useState } from 'react'

/**
 * Écran de connexion / inscription / mot de passe oublié.
 * La réinitialisation utilise un code à usage unique fourni par
 * l'administrateur du site (voir onglet Administration).
 */
export default function AuthScreen({ onAuthed }) {
  const [tab, setTab] = useState('login') // 'login' | 'register' | 'reset'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  function switchTab(next) {
    setTab(next)
    setError('')
    setInfo('')
    setPassword('')
    setConfirm('')
    setResetCode('')
    setAcceptTerms(false)
  }

  async function submitAuth() {
    if (!pseudo.trim() || !password) { setError('Remplissez tous les champs.'); return }
    if (tab === 'register' && password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (tab === 'register' && !acceptTerms) { setError('Vous devez accepter les CGU et confirmer avoir au moins 15 ans.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo.trim(), password, acceptTerms: tab === 'register' ? acceptTerms : undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); setLoading(false); return }
      onAuthed(json.token, json.user)
    } catch {
      setError('Erreur de connexion')
    }
    setLoading(false)
  }

  async function submitReset() {
    if (!pseudo.trim() || !resetCode.trim() || !password) { setError('Remplissez tous les champs.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo.trim(), code: resetCode, newPassword: password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); setLoading(false); return }
      // Réinitialisation réussie : connexion immédiate
      onAuthed(json.token, json.user)
    } catch {
      setError('Erreur de connexion')
    }
    setLoading(false)
  }

  const submit = tab === 'reset' ? submitReset : submitAuth
  const onKey = e => e.key === 'Enter' && submit()

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>CINÉMARATHON</h1>
          <p>Le marathon entre amis</p>
        </div>

        {tab !== 'reset' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>Connexion</button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>Inscription</button>
          </div>
        )}

        {tab === 'reset' && (
          <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.6, marginBottom: '18px' }}>
            Demande un code de réinitialisation à l'administrateur du site, puis choisis un nouveau mot de passe.
          </p>
        )}

        <div className="form-group">
          <label>Pseudo</label>
          <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)}
            placeholder={tab === 'register' ? 'Choisissez un pseudo' : 'Votre pseudo'} onKeyDown={onKey} />
        </div>

        {tab === 'reset' && (
          <div className="form-group">
            <label>Code de réinitialisation</label>
            <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)}
              placeholder="Ex: K7XQ-M2P9" onKeyDown={onKey} />
          </div>
        )}

        <div className="form-group">
          <label>{tab === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder={tab === 'login' ? '••••••••' : 'Au moins 4 caractères'} onKeyDown={onKey} />
        </div>

        {(tab === 'register' || tab === 'reset') && (
          <div className="form-group">
            <label>Confirmer</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" onKeyDown={onKey} />
          </div>
        )}

        {tab === 'register' && (
          <label className="auth-terms">
            <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} />
            <span>
              J'ai au moins 15 ans et j'accepte les{' '}
              <a href="/cgu" target="_blank" rel="noopener noreferrer">CGU</a> et la{' '}
              <a href="/confidentialite" target="_blank" rel="noopener noreferrer">politique de confidentialité</a>.
            </span>
          </label>
        )}

        <button className="btn-primary" onClick={submit} disabled={loading || (tab === 'register' && !acceptTerms)}>
          {loading
            ? 'Un instant…'
            : tab === 'login' ? 'Entrer dans la salle'
            : tab === 'register' ? 'Créer mon compte'
            : 'Réinitialiser et me connecter'}
        </button>

        {tab === 'login' && (
          <button className="auth-link" onClick={() => switchTab('reset')}>
            Mot de passe oublié ?
          </button>
        )}
        {tab === 'reset' && (
          <button className="auth-link" onClick={() => switchTab('login')}>
            ← Retour à la connexion
          </button>
        )}

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}
      </div>
      <div className="auth-ai-note">
        Site développé avec l'aide d'une intelligence artificielle (Claude, Anthropic)
      </div>
    </div>
  )
}

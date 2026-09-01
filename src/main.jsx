import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

const supabase = createClient(
  'https://ffgfigkeeeauzkifopei.supabase.co',
  'sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

const cards = [
  { title: 'Reviews', detail: '3 test reviews due', accent: 'blue' },
  { title: 'Evidence', detail: '8 test items waiting', accent: 'yellow' },
  { title: 'Progress', detail: 'View learner progress', accent: 'teal' },
  { title: 'Courses', detail: '4 test courses', accent: 'coral' },
]

function NisiaMark({ large = false }) {
  return (
    <div className={`brand${large ? ' brand-large' : ''}`} aria-label="Nisia">
      <div className="wordmark">
        <span>N</span>
        <span className="brand-i brand-yellow">i</span>
        <span>s</span>
        <span className="brand-i brand-blue">i</span>
        <span>a</span>
      </div>
      <div className="brand-dots" aria-hidden="true">
        <span className="brand-dot brand-coral" />
        <span className="brand-dot brand-teal" />
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <main className="auth-shell auth-loading" aria-live="polite">
      <NisiaMark large />
    </main>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === 'submitting') return

    setStatus('submitting')
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setStatus('error')
      setMessage('Email or password not recognised.')
      return
    }

    setStatus('idle')
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="sign-in-title">
        <div className="auth-brand-row">
          <NisiaMark large />
          <div className="accent-dots" aria-hidden="true">
            <span className="dot yellow" />
            <span className="dot blue" />
            <span className="dot coral" />
            <span className="dot teal" />
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">Nisia portal</p>
          <h1 id="sign-in-title">Sign in</h1>
          <p className="subtle">Use your Nisia account to continue.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="text-input"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="text-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message ? <p className="auth-message error-message" role="alert">{message}</p> : null}

          <button className="primary-button" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="development-note">Development preview · authorised test accounts only</p>
      </section>
    </main>
  )
}

function MfaScreen({ factorId, onVerified }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === 'submitting') return

    setStatus('submitting')
    setMessage('')

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    })

    if (error) {
      setStatus('error')
      setMessage('That verification code was not accepted.')
      return
    }

    setStatus('idle')
    onVerified()
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="mfa-title">
        <div className="auth-brand-row">
          <NisiaMark large />
        </div>
        <div className="auth-heading">
          <p className="eyebrow">Security check</p>
          <h1 id="mfa-title">Verification</h1>
          <p className="subtle">Enter the six-digit code from your authenticator app.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="mfa-code">Verification code</label>
          <input
            id="mfa-code"
            className="text-input code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength="6"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
          {message ? <p className="auth-message error-message" role="alert">{message}</p> : null}
          <button className="primary-button" type="submit" disabled={status === 'submitting' || code.length !== 6}>
            {status === 'submitting' ? 'Checking…' : 'Verify'}
          </button>
          <button className="secondary-button" type="button" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </form>
      </section>
    </main>
  )
}

function MfaUnavailableScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <NisiaMark large />
        <div className="auth-heading">
          <p className="eyebrow">Security check</p>
          <h1>MFA required</h1>
          <p className="subtle">This account requires multi-factor authentication, but no verified authenticator is available.</p>
        </div>
        <button className="secondary-button full-width" type="button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </section>
    </main>
  )
}

function Dashboard() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <NisiaMark />
        <button className="profile-button" type="button" aria-label="Sign out" title="Sign out" onClick={() => supabase.auth.signOut()}>
          <span className="profile-dot" />
        </button>
      </header>

      <section className="content">
        <div className="intro-row">
          <div>
            <p className="eyebrow">Development preview</p>
            <h1>Good morning</h1>
            <p className="subtle">Fake data only while Nisia is being built.</p>
          </div>
          <div className="accent-dots" aria-hidden="true">
            <span className="dot yellow" />
            <span className="dot blue" />
            <span className="dot coral" />
            <span className="dot teal" />
          </div>
        </div>

        <button className="hero-card" type="button">
          <div>
            <span className="card-kicker">Learners</span>
            <strong>12 test learners</strong>
            <span className="card-detail">Open learner overview</span>
          </div>
          <span className="arrow" aria-hidden="true">→</span>
        </button>

        <div className="card-grid">
          {cards.map((card) => (
            <button className={`small-card ${card.accent}`} type="button" key={card.title}>
              <span className="small-card-title">{card.title}</span>
              <span className="small-card-detail">{card.detail}</span>
              <span className="mini-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function AuthenticatedApp() {
  const [mfaState, setMfaState] = useState({ status: 'checking', factorId: null })

  async function checkMfa() {
    setMfaState({ status: 'checking', factorId: null })

    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError) {
      setMfaState({ status: 'ready', factorId: null })
      return
    }

    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) {
        setMfaState({ status: 'unavailable', factorId: null })
        return
      }

      const factor = factorsData?.totp?.find((item) => item.status === 'verified')
      if (!factor) {
        setMfaState({ status: 'unavailable', factorId: null })
        return
      }

      setMfaState({ status: 'required', factorId: factor.id })
      return
    }

    setMfaState({ status: 'ready', factorId: null })
  }

  useEffect(() => {
    checkMfa()
  }, [])

  if (mfaState.status === 'checking') return <LoadingScreen />
  if (mfaState.status === 'required') return <MfaScreen factorId={mfaState.factorId} onVerified={checkMfa} />
  if (mfaState.status === 'unavailable') return <MfaUnavailableScreen />
  return <Dashboard />
}

function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setReady(true)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (!ready) return <LoadingScreen />
  if (!session) return <LoginScreen />
  return <AuthenticatedApp />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

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

const staffRoles = new Set(['admin', 'assessor', 'tutor', 'employer'])

function titleCase(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

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
      <div className="loading-lockup">
        <NisiaMark large />
        <p className="subtle">Checking secure access…</p>
      </div>
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
          <p className="eyebrow">Secure portal</p>
          <h1 id="sign-in-title">Sign in</h1>
          <p className="subtle">Use your Nisia account to continue.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            className="text-input"
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="field-label" htmlFor="password">Password</label>
          <input
            className="text-input"
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message && <p className="auth-message error-message">{message}</p>}

          <button className="primary-button" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="development-note">Development environment · authorised users only</p>
      </section>
    </main>
  )
}

function AccessMessage({ title, message, onSignOut }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel access-panel">
        <NisiaMark large />
        <div className="auth-heading compact-heading">
          <p className="eyebrow">Access</p>
          <h1>{title}</h1>
          <p className="subtle">{message}</p>
        </div>
        <button className="secondary-button full-width" type="button" onClick={onSignOut}>Sign out</button>
      </section>
    </main>
  )
}

function MFAScreen({ existingFactorId, onVerified, onSignOut }) {
  const [factorId, setFactorId] = useState(existingFactorId || '')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const hasVerifiedFactor = Boolean(existingFactorId)
  const enrollmentStarted = Boolean(factorId && !hasVerifiedFactor)

  async function startEnrollment() {
    setStatus('submitting')
    setMessage('')

    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError

      const unfinished = (factors?.totp || []).filter(
        (factor) => factor.status !== 'verified' && factor.friendly_name === 'Nisia Portal',
      )

      for (const factor of unfinished) {
        const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
        if (removeError) throw removeError
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Nisia Portal',
      })

      if (error || !data?.id || !data?.totp) throw error || new Error('Missing MFA enrollment data')

      setFactorId(data.id)
      setQrCode(data.totp.qr_code || '')
      setSecret(data.totp.secret || '')
      setStatus('idle')
    } catch (error) {
      console.error('Nisia MFA enrollment failed', error)
      setStatus('error')
      setMessage('MFA setup could not be started. Try again.')
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    const cleanCode = code.replace(/\s/g, '')
    if (!factorId || !/^\d{6}$/.test(cleanCode)) {
      setMessage('Enter the 6-digit code from your authenticator app.')
      return
    }

    setStatus('submitting')
    setMessage('')

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: cleanCode,
    })

    if (error) {
      setStatus('error')
      setMessage('That code could not be verified. Check the code and try again.')
      return
    }

    setStatus('idle')
    setCode('')
    onVerified()
  }

  const qrSrc = qrCode
    ? (qrCode.startsWith('data:') ? qrCode : `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`)
    : ''

  return (
    <main className="auth-shell">
      <section className="auth-panel mfa-panel" aria-labelledby="mfa-title">
        <div className="auth-brand-row">
          <NisiaMark large />
          <span className="security-pill">MFA required</span>
        </div>

        <div className="auth-heading compact-heading">
          <p className="eyebrow">Second factor</p>
          <h1 id="mfa-title">Verify it’s you</h1>
          <p className="subtle">
            {hasVerifiedFactor
              ? 'Open your authenticator app and enter the current 6-digit code.'
              : 'Staff accounts must set up an authenticator before protected organisation data can open.'}
          </p>
        </div>

        {!hasVerifiedFactor && !enrollmentStarted && (
          <button className="primary-button full-width" type="button" onClick={startEnrollment} disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Starting…' : 'Set up authenticator'}
          </button>
        )}

        {!hasVerifiedFactor && enrollmentStarted && (
          <div className="mfa-setup">
            {qrSrc && <img className="mfa-qr" src={qrSrc} alt="Authenticator setup QR code" />}
            <p className="setup-note">Scan this with your authenticator app. If you are using this same phone, add the setup key manually instead.</p>
            {secret && (
              <div className="secret-box">
                <span>Setup key</span>
                <code>{secret}</code>
              </div>
            )}
          </div>
        )}

        {(hasVerifiedFactor || enrollmentStarted) && (
          <form className="auth-form mfa-form" onSubmit={verifyCode}>
            <label className="field-label" htmlFor="mfa-code">Authenticator code</label>
            <input
              className="text-input code-input"
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
            {message && <p className="auth-message error-message">{message}</p>}
            <button className="primary-button" type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {message && !factorId && <p className="auth-message error-message">{message}</p>}
        <button className="secondary-button full-width quiet-button" type="button" onClick={onSignOut}>Sign out</button>
      </section>
    </main>
  )
}

function ProfileMenu({ context, email, onSignOut }) {
  return (
    <div className="profile-menu" role="dialog" aria-label="Account">
      <p className="profile-org">{context.organisation.name}</p>
      <p className="profile-role">{context.roles.map(titleCase).join(' · ')}</p>
      <p className="profile-email">{email}</p>
      <button type="button" className="menu-signout" onClick={onSignOut}>Sign out</button>
    </div>
  )
}

function Dashboard({ context, counts, email, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false)

  const cards = [
    { title: 'Reviews', detail: `${counts.reviews} ${counts.reviews === 1 ? 'review' : 'reviews'}`, accent: 'blue' },
    { title: 'Evidence', detail: `${counts.evidence} ${counts.evidence === 1 ? 'item' : 'items'}`, accent: 'yellow' },
    { title: 'Progress', detail: `${counts.enrolments} ${counts.enrolments === 1 ? 'enrolment' : 'enrolments'}`, accent: 'teal' },
    { title: 'Courses', detail: `${counts.courses} ${counts.courses === 1 ? 'course' : 'courses'}`, accent: 'coral' },
  ]

  return (
    <main className="page-shell">
      <header className="topbar">
        <NisiaMark />
        <div className="profile-wrap">
          <button
            className="profile-button"
            type="button"
            aria-label="Account"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="profile-dot" />
          </button>
          {profileOpen && <ProfileMenu context={context} email={email} onSignOut={onSignOut} />}
        </div>
      </header>

      <section className="content">
        <div className="intro-row">
          <div>
            <p className="eyebrow">Development preview</p>
            <h1>Good morning</h1>
            <p className="subtle">{context.organisation.name} · {context.roles.map(titleCase).join(' · ')}</p>
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
            <strong>{counts.learners} {counts.learners === 1 ? 'learner' : 'learners'}</strong>
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

async function loadAccessContext(userId) {
  const { data: memberships, error: membershipError } = await supabase
    .from('organisation_members')
    .select('id, organisation_id, active')
    .eq('user_id', userId)
    .eq('active', true)

  if (membershipError) throw membershipError
  if (!memberships?.length) return null

  const membership = memberships[0]

  const [{ data: organisation, error: organisationError }, { data: roleLinks, error: roleLinkError }] = await Promise.all([
    supabase.from('organisations').select('id, name').eq('id', membership.organisation_id).single(),
    supabase.from('organisation_member_roles').select('role_id').eq('organisation_member_id', membership.id),
  ])

  if (organisationError) throw organisationError
  if (roleLinkError) throw roleLinkError

  const roleIds = (roleLinks || []).map((item) => item.role_id)
  let roles = []

  if (roleIds.length) {
    const { data: roleRows, error: roleError } = await supabase
      .from('roles')
      .select('code')
      .in('id', roleIds)

    if (roleError) throw roleError
    roles = (roleRows || []).map((item) => item.code)
  }

  if (!roles.length) return null

  return {
    membershipId: membership.id,
    organisation,
    roles,
    requiresMFA: roles.some((role) => staffRoles.has(role)),
  }
}

async function loadDashboardCounts(organisationId) {
  const [learners, reviews, evidence, enrolments, courses] = await Promise.all([
    supabase.from('learners').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
    supabase.from('evidence').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
    supabase.from('enrolments').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
  ])

  const failures = [learners, reviews, evidence, enrolments, courses].filter((result) => result.error)
  if (failures.length) throw failures[0].error

  return {
    learners: learners.count || 0,
    reviews: reviews.count || 0,
    evidence: evidence.count || 0,
    enrolments: enrolments.count || 0,
    courses: courses.count || 0,
  }
}

function App() {
  const [session, setSession] = useState(undefined)
  const [gate, setGate] = useState('loading')
  const [context, setContext] = useState(null)
  const [counts, setCounts] = useState(null)
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (session === undefined) return
      if (!session) {
        setGate('login')
        setContext(null)
        setCounts(null)
        return
      }

      setGate('loading')

      try {
        const accessContext = await loadAccessContext(session.user.id)
        if (cancelled) return

        if (!accessContext) {
          setGate('denied')
          setContext(null)
          setCounts(null)
          return
        }

        setContext(accessContext)

        if (accessContext.requiresMFA) {
          const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (aalError) throw aalError

          if (aal?.currentLevel !== 'aal2') {
            const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors()
            if (factorError) throw factorError

            const verifiedTotp = (factors?.totp || []).find((factor) => factor.status === 'verified')
            if (cancelled) return
            setMfaFactorId(verifiedTotp?.id || '')
            setGate('mfa')
            setCounts(null)
            return
          }
        }

        const dashboardCounts = await loadDashboardCounts(accessContext.organisation.id)
        if (cancelled) return
        setCounts(dashboardCounts)
        setGate('ready')
      } catch (error) {
        console.error('Nisia access bootstrap failed', error)
        if (!cancelled) setGate('error')
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [session, refreshKey])

  async function signOut() {
    await supabase.auth.signOut()
  }

  function handleMFAVerified() {
    setRefreshKey((value) => value + 1)
  }

  if (gate === 'loading') return <LoadingScreen />
  if (gate === 'login') return <LoginScreen />
  if (gate === 'mfa' && context) return <MFAScreen existingFactorId={mfaFactorId} onVerified={handleMFAVerified} onSignOut={signOut} />
  if (gate === 'denied') return <AccessMessage title="Access not assigned" message="This account does not have an active Nisia organisation membership and role." onSignOut={signOut} />
  if (gate === 'error') return <AccessMessage title="Unable to load Nisia" message="Your account is signed in, but secure organisation access could not be loaded. Try again shortly." onSignOut={signOut} />
  if (gate === 'ready' && context && counts) return <Dashboard context={context} counts={counts} email={session?.user?.email || ''} onSignOut={signOut} />

  return <LoadingScreen />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

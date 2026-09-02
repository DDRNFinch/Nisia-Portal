import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'
import './learners.css'
import './courses.css'

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
const MFA_SETUP_KEY = 'nisia-mfa-setup-v1'

function titleCase(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function readMFASetup() {
  try {
    const raw = sessionStorage.getItem(MFA_SETUP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.factorId || !parsed?.qrCode || !parsed?.secret) return null
    return parsed
  } catch {
    return null
  }
}

function saveMFASetup(setup) {
  try {
    sessionStorage.setItem(MFA_SETUP_KEY, JSON.stringify(setup))
  } catch {
    // The setup still works while this page stays open even if session storage is unavailable.
  }
}

function clearMFASetup() {
  try {
    sessionStorage.removeItem(MFA_SETUP_KEY)
  } catch {
    // Nothing else is required if session storage is unavailable.
  }
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
  const storedSetup = existingFactorId ? null : readMFASetup()
  const [factorId, setFactorId] = useState(existingFactorId || storedSetup?.factorId || '')
  const [qrCode, setQrCode] = useState(storedSetup?.qrCode || '')
  const [secret, setSecret] = useState(storedSetup?.secret || '')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const hasVerifiedFactor = Boolean(existingFactorId)
  const enrollmentStarted = Boolean(factorId && !hasVerifiedFactor)

  useEffect(() => {
    if (hasVerifiedFactor) clearMFASetup()
  }, [hasVerifiedFactor])

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

      clearMFASetup()

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Nisia Portal',
      })

      if (error || !data?.id || !data?.totp) throw error || new Error('Missing MFA enrollment data')

      const setup = {
        factorId: data.id,
        qrCode: data.totp.qr_code || '',
        secret: data.totp.secret || '',
      }

      saveMFASetup(setup)
      setFactorId(setup.factorId)
      setQrCode(setup.qrCode)
      setSecret(setup.secret)
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

    clearMFASetup()
    setStatus('idle')
    setCode('')
    onVerified()
  }

  async function signOutFromMFA() {
    clearMFASetup()
    await onSignOut()
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
              : enrollmentStarted
                ? 'Your setup is waiting. Open your authenticator app, then return here and enter its current 6-digit code.'
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
            <p className="setup-note">Scan this with your authenticator app. If you are using this same phone, add the setup key manually instead. You can leave Nisia to get the code and come back without restarting setup.</p>
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
        <button className="secondary-button full-width quiet-button" type="button" onClick={signOutFromMFA}>Sign out</button>
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

function PortalTopbar({ context, email, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
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
  )
}

function Dashboard({ context, counts, email, onSignOut, onOpenLearners, onOpenCourses }) {
  const cards = [
    { title: 'Reviews', detail: `${counts.reviews} ${counts.reviews === 1 ? 'review' : 'reviews'}`, accent: 'blue' },
    { title: 'Evidence', detail: `${counts.evidence} ${counts.evidence === 1 ? 'item' : 'items'}`, accent: 'yellow' },
    { title: 'Progress', detail: `${counts.enrolments} ${counts.enrolments === 1 ? 'enrolment' : 'enrolments'}`, accent: 'teal' },
    { title: 'Courses', detail: `${counts.courses} ${counts.courses === 1 ? 'course' : 'courses'}`, accent: 'coral', onClick: onOpenCourses },
  ]

  return (
    <main className="page-shell">
      <PortalTopbar context={context} email={email} onSignOut={onSignOut} />

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

        <button className="hero-card" type="button" onClick={onOpenLearners}>
          <div>
            <span className="card-kicker">Learners</span>
            <strong>{counts.learners} {counts.learners === 1 ? 'learner' : 'learners'}</strong>
            <span className="card-detail">Open learner overview</span>
          </div>
          <span className="arrow" aria-hidden="true">→</span>
        </button>

        <div className="card-grid">
          {cards.map((card) => (
            <button className={`small-card ${card.accent}`} type="button" key={card.title} onClick={card.onClick}>
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

function TestCredentials({ credentials, onClose }) {
  if (!credentials) return null

  return (
    <div className="credential-overlay" role="presentation">
      <section className="credential-card" role="dialog" aria-modal="true" aria-labelledby="test-created-title">
        <p className="eyebrow">Fake development account</p>
        <h2 id="test-created-title">Test learner created</h2>
        <p className="credential-name">{credentials.display_name}</p>
        <div className="credential-row">
          <span>Email</span>
          <code>{credentials.email}</code>
        </div>
        <div className="credential-row">
          <span>Password</span>
          <code>{credentials.password}</code>
        </div>
        <p className="credential-note">These are fake development credentials. The password is not stored in the Nisia database and is shown here only so this test account can be used later.</p>
        <button className="primary-button full-width" type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  )
}

async function loadLearners(organisationId) {
  const { data: learnerRows, error: learnerError } = await supabase
    .from('learners')
    .select('id, organisation_member_id, created_at')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: true })

  if (learnerError) throw learnerError
  if (!learnerRows?.length) return []

  const memberIds = learnerRows.map((learner) => learner.organisation_member_id)
  const { data: members, error: memberError } = await supabase
    .from('organisation_members')
    .select('id, user_id')
    .in('id', memberIds)
  if (memberError) throw memberError

  const userIds = (members || []).map((member) => member.user_id)
  const { data: profiles, error: profileError } = userIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
    : { data: [], error: null }
  if (profileError) throw profileError

  const learnerIds = learnerRows.map((learner) => learner.id)
  const { data: enrolments, error: enrolmentError } = await supabase
    .from('enrolments')
    .select('id, learner_id, course_id, start_date, end_date')
    .in('learner_id', learnerIds)
  if (enrolmentError) throw enrolmentError

  const courseIds = [...new Set((enrolments || []).map((enrolment) => enrolment.course_id))]
  const { data: courses, error: courseError } = courseIds.length
    ? await supabase.from('courses').select('id, code, title').in('id', courseIds)
    : { data: [], error: null }
  if (courseError) throw courseError

  const memberById = new Map((members || []).map((member) => [member.id, member]))
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const courseById = new Map((courses || []).map((course) => [course.id, course]))

  return learnerRows.map((learner, index) => {
    const member = memberById.get(learner.organisation_member_id)
    const profile = member ? profileById.get(member.user_id) : null
    const learnerEnrolments = (enrolments || [])
      .filter((enrolment) => enrolment.learner_id === learner.id)
      .map((enrolment) => ({ ...enrolment, course: courseById.get(enrolment.course_id) || null }))

    return {
      ...learner,
      displayName: profile?.display_name || `Test Learner ${String(index + 1).padStart(3, '0')}`,
      enrolments: learnerEnrolments,
    }
  })
}

async function loadLearnerActivityCounts(learner) {
  const enrolmentIds = learner.enrolments.map((enrolment) => enrolment.id)
  if (!enrolmentIds.length) {
    return { evidence: 0, reviews: 0, otj: 0, targets: 0, observations: 0 }
  }

  const [evidence, reviews, otj, targets, observations] = await Promise.all([
    supabase.from('evidence').select('*', { count: 'exact', head: true }).in('enrolment_id', enrolmentIds),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).in('enrolment_id', enrolmentIds),
    supabase.from('otj_entries').select('*', { count: 'exact', head: true }).in('enrolment_id', enrolmentIds),
    supabase.from('targets').select('*', { count: 'exact', head: true }).in('enrolment_id', enrolmentIds),
    supabase.from('observations').select('*', { count: 'exact', head: true }).in('enrolment_id', enrolmentIds),
  ])

  const results = [evidence, reviews, otj, targets, observations]
  const failure = results.find((result) => result.error)
  if (failure) throw failure.error

  return {
    evidence: evidence.count || 0,
    reviews: reviews.count || 0,
    otj: otj.count || 0,
    targets: targets.count || 0,
    observations: observations.count || 0,
  }
}

async function loadCourses() {
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, code, title, created_at')
    .order('title', { ascending: true })
  if (courseError) throw courseError

  const courseIds = (courses || []).map((course) => course.id)
  const { data: sections, error: sectionError } = courseIds.length
    ? await supabase.from('course_sections').select('id, course_id').in('course_id', courseIds)
    : { data: [], error: null }
  if (sectionError) throw sectionError

  return (courses || []).map((course) => ({
    ...course,
    sectionCount: (sections || []).filter((section) => section.course_id === course.id).length,
  }))
}

function cleanCourseProgressValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function courseEvidencePathKey(path) {
  return JSON.stringify((Array.isArray(path) ? path : []).map(cleanCourseProgressValue).filter(Boolean))
}

function courseEvidenceCounts(rows) {
  const counts = { photo: 0, video: 0, audio: 0, written: 0, document: 0, other: 0 }
  for (const row of rows) {
    const type = cleanCourseProgressValue(row?.evidence_type).toLowerCase()
    if (Object.prototype.hasOwnProperty.call(counts, type)) counts[type] += 1
    else counts.other += 1
  }
  return counts
}

function courseEvidenceMethodSatisfied(label, rows) {
  const text = cleanCourseProgressValue(label).toLowerCase().replace(/[–—]/g, '-')
  if (!text || !rows.length) return false

  const counts = courseEvidenceCounts(rows)
  const has = (type) => counts[type] > 0

  if (text.includes(' or ')) {
    const options = text.split(/\s+or\s+/).map((part) => part.trim()).filter(Boolean)
    if (options.length > 1) return options.some((option) => courseEvidenceMethodSatisfied(option, rows))
  }

  const requirements = []

  if (/set of 3 photos|3-photo set|3 photos/.test(text) && !/1-3 photos/.test(text)) {
    requirements.push(counts.photo >= 3)
  } else if (/photo/.test(text)) {
    requirements.push(has('photo'))
  }

  if (/video/.test(text)) requirements.push(has('video'))
  if (/audio/.test(text)) requirements.push(has('audio'))
  if (/written|text statement|written account/.test(text)) requirements.push(has('written'))
  if (/document|file|pdf/.test(text)) requirements.push(has('document'))
  if (/witness/.test(text)) requirements.push(has('other'))

  return requirements.length > 0 && requirements.every(Boolean)
}

function completedCourseEvidencePaths(evidenceRows) {
  const byPath = new Map()

  for (const row of evidenceRows || []) {
    const metadata = row?.source_metadata && typeof row.source_metadata === 'object' ? row.source_metadata : {}
    if (cleanCourseProgressValue(metadata.source).toLowerCase() !== 'evia') continue
    const key = courseEvidencePathKey(metadata.path)
    if (key === '[]') continue
    if (!byPath.has(key)) byPath.set(key, [])
    byPath.get(key).push(row)
  }

  const completed = new Set()
  for (const [key, rows] of byPath) {
    const byMethod = new Map()
    for (const row of rows) {
      const label = cleanCourseProgressValue(row?.source_metadata?.method?.label)
      if (!byMethod.has(label)) byMethod.set(label, [])
      byMethod.get(label).push(row)
    }
    if ([...byMethod].some(([label, methodRows]) => courseEvidenceMethodSatisfied(label, methodRows))) completed.add(key)
  }

  return completed
}

async function fetchCourseMappingJson(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Course mapping request failed (${response.status})`)
  return response.json()
}

async function loadCourseEvidencePaths(pointer) {
  const packUrl = cleanCourseProgressValue(pointer?.packUrl)
  if (!packUrl) throw new Error('Course mapping pack is unavailable')
  if (pointer?.patch || pointer?.customisations) throw new Error('Customised mapping needs its published course structure')

  const pack = await fetchCourseMappingJson(packUrl)
  if (cleanCourseProgressValue(pack?.courseType).toLowerCase() !== 'ksb') throw new Error('This course does not use KSB mapping')

  const packDir = new URL('./', packUrl)
  const categoryUrls = (pack.categoryFiles || []).map((file) => new URL(file, packDir).href)
  const categories = await Promise.all(categoryUrls.map(fetchCourseMappingJson))
  const paths = new Set()

  for (const category of categories) {
    const categoryTitle = cleanCourseProgressValue(category?.title)
    for (const subcategory of category?.subcategories || []) {
      const subcategoryTitle = cleanCourseProgressValue(subcategory?.title)
      for (const task of subcategory?.tasks || []) {
        const taskTitle = cleanCourseProgressValue(task?.title)
        if (!categoryTitle || !subcategoryTitle || !taskTitle) continue
        paths.add(courseEvidencePathKey([categoryTitle, subcategoryTitle, taskTitle]))
      }
    }
  }

  return paths
}

async function loadCourseProgress(enrolment) {
  const courseId = enrolment.course_id
  const [
    { data: sections, error: sectionError },
    { data: criteria, error: criteriaError },
    { data: evidenceRows, error: evidenceError },
    { data: course, error: courseError },
  ] = await Promise.all([
    supabase.from('course_sections').select('id, title, position').eq('course_id', courseId).order('position', { ascending: true }),
    supabase.from('criteria').select('id, section_id').eq('course_id', courseId),
    supabase.from('evidence').select('id, evidence_type, source_metadata').eq('enrolment_id', enrolment.id),
    supabase.from('courses').select('source_pointer').eq('id', courseId).single(),
  ])

  if (sectionError) throw sectionError
  if (criteriaError) throw criteriaError
  if (evidenceError) throw evidenceError
  if (courseError) throw courseError

  const coursePaths = await loadCourseEvidencePaths(course?.source_pointer)
  const completedPaths = completedCourseEvidencePaths(evidenceRows || [])
  const completedEvidenceAreas = [...coursePaths].filter((key) => completedPaths.has(key)).length
  const totalEvidenceAreas = coursePaths.size
  const progress = totalEvidenceAreas ? Math.round((completedEvidenceAreas / totalEvidenceAreas) * 100) : 0
  const totalCriteria = (criteria || []).length

  return {
    sections: (sections || []).map((section) => ({
      ...section,
      criteriaCount: (criteria || []).filter((criterion) => criterion.section_id === section.id).length,
    })),
    totalCriteria,
    completedEvidenceAreas,
    totalEvidenceAreas,
    progress,
  }
}

function LearnersPage({ context, email, onSignOut, onBack, onOpenLearner, onLearnerCreated }) {
  const [learners, setLearners] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [credentials, setCredentials] = useState(null)
  const canAddTestLearner = context.roles.includes('admin')

  async function refreshLearners() {
    setStatus('loading')
    setMessage('')
    try {
      const rows = await loadLearners(context.organisation.id)
      setLearners(rows)
      setStatus('ready')
    } catch (error) {
      console.error('Unable to load learners', error)
      setStatus('error')
      setMessage('Learners could not be loaded.')
    }
  }

  useEffect(() => {
    refreshLearners()
  }, [context.organisation.id])

  async function addTestLearner() {
    if (!canAddTestLearner || status === 'creating') return
    setStatus('creating')
    setMessage('')

    const { data, error } = await supabase.functions.invoke('admin-create-test-learner', {
      body: { organisation_id: context.organisation.id },
    })

    if (error || !data?.learner_id) {
      console.error('Unable to create test learner', error, data)
      setStatus('ready')
      setMessage('The test learner could not be created.')
      return
    }

    setCredentials(data)
    await refreshLearners()
    onLearnerCreated()
  }

  return (
    <main className="page-shell">
      <PortalTopbar context={context} email={email} onSignOut={onSignOut} />
      <section className="content learners-content">
        <button className="back-link" type="button" onClick={onBack}>← Home</button>

        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Organisation</p>
            <h1>Learners</h1>
            <p className="subtle">Only learners this account is authorised to access are shown.</p>
          </div>
          {canAddTestLearner && (
            <button className="add-test-button" type="button" onClick={addTestLearner} disabled={status === 'creating'}>
              {status === 'creating' ? 'Creating…' : '+ Add test learner'}
            </button>
          )}
        </div>

        {message && <p className="auth-message error-message learner-message">{message}</p>}

        {status === 'loading' && <div className="learner-empty"><p>Loading learners…</p></div>}

        {status !== 'loading' && learners?.length === 0 && (
          <div className="learner-empty">
            <span className="empty-dot" />
            <h2>No learners yet</h2>
            <p>This organisation currently has no learner records.</p>
          </div>
        )}

        {learners?.length > 0 && (
          <div className="learner-list">
            {learners.map((learner) => {
              const primaryEnrolment = learner.enrolments[0]
              const courseText = primaryEnrolment?.course
                ? `${primaryEnrolment.course.title}${primaryEnrolment.course.code ? ` · ${primaryEnrolment.course.code}` : ''}`
                : 'No course assigned'

              return (
                <button className="learner-row" type="button" key={learner.id} onClick={() => onOpenLearner(learner)}>
                  <div>
                    <strong>{learner.displayName}</strong>
                    <span>{courseText}</span>
                  </div>
                  <span className="learner-arrow" aria-hidden="true">→</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <TestCredentials credentials={credentials} onClose={() => setCredentials(null)} />
    </main>
  )
}

function CoursesPage({ context, email, onSignOut, onBack, assignmentLearner, onAssigned }) {
  const [courses, setCourses] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const canAssign = Boolean(assignmentLearner && context.roles.includes('admin'))

  useEffect(() => {
    let cancelled = false
    loadCourses()
      .then((rows) => {
        if (!cancelled) {
          setCourses(rows)
          setStatus('ready')
        }
      })
      .catch((error) => {
        console.error('Unable to load courses', error)
        if (!cancelled) {
          setStatus('error')
          setMessage('Courses could not be loaded.')
        }
      })
    return () => { cancelled = true }
  }, [])

  async function assignCourse(course) {
    if (!canAssign || status === 'assigning') return
    setStatus('assigning')
    setMessage('')

    const { data, error } = await supabase.functions.invoke('admin-assign-course', {
      body: {
        organisation_id: context.organisation.id,
        learner_id: assignmentLearner.id,
        course_id: course.id,
      },
    })

    if (error || !data?.enrolment_id) {
      console.error('Unable to assign course', error, data)
      setStatus('ready')
      setMessage('The course could not be assigned.')
      return
    }

    try {
      const learners = await loadLearners(context.organisation.id)
      const refreshed = learners.find((learner) => learner.id === assignmentLearner.id)
      if (!refreshed) throw new Error('Learner refresh failed')
      onAssigned(refreshed)
    } catch (refreshError) {
      console.error('Course assigned but learner refresh failed', refreshError)
      setStatus('ready')
      setMessage('The course was assigned, but the learner view could not refresh yet.')
    }
  }

  return (
    <main className="page-shell">
      <PortalTopbar context={context} email={email} onSignOut={onSignOut} />
      <section className="content courses-content">
        <button className="back-link" type="button" onClick={onBack}>{assignmentLearner ? '← Learner' : '← Home'}</button>

        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Organisation</p>
            <h1>{assignmentLearner ? 'Assign course' : 'Courses'}</h1>
            <p className="subtle">{assignmentLearner ? 'Choose a course for this fake development learner.' : 'Courses currently available in Nisia.'}</p>
          </div>
        </div>

        {assignmentLearner && (
          <div className="assignment-banner">
            <strong>{assignmentLearner.displayName}</strong>
            <span>Fake development learner</span>
          </div>
        )}

        {message && <p className="auth-message error-message learner-message">{message}</p>}

        {status === 'loading' && <div className="course-empty"><p>Loading courses…</p></div>}
        {status !== 'loading' && courses?.length === 0 && <div className="course-empty"><p>No courses are available yet.</p></div>}

        {courses?.length > 0 && (
          <div className="course-list">
            {courses.map((course) => (
              <div className="course-row" key={course.id}>
                <div className="course-row-copy">
                  <strong>{course.title}</strong>
                  <span>{course.code} · {course.sectionCount} {course.sectionCount === 1 ? 'section' : 'sections'}</span>
                </div>
                {canAssign ? (
                  <button className="course-row-action" type="button" onClick={() => assignCourse(course)} disabled={status === 'assigning'}>
                    {status === 'assigning' ? 'Assigning…' : 'Assign'}
                  </button>
                ) : (
                  <span className="course-row-arrow" aria-hidden="true">→</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function LearnerOverviewPage({ learner, context, email, onSignOut, onBack, onAssignCourse, onOpenCourse }) {
  const [activity, setActivity] = useState(null)
  const [message, setMessage] = useState('')
  const primaryEnrolment = learner.enrolments[0]
  const courseText = primaryEnrolment?.course
    ? `${primaryEnrolment.course.title}${primaryEnrolment.course.code ? ` · ${primaryEnrolment.course.code}` : ''}`
    : 'No course assigned'
  const canAssignCourse = context.roles.includes('admin') && !primaryEnrolment

  useEffect(() => {
    let cancelled = false
    loadLearnerActivityCounts(learner)
      .then((counts) => {
        if (!cancelled) setActivity(counts)
      })
      .catch((error) => {
        console.error('Unable to load learner overview', error)
        if (!cancelled) setMessage('Learner activity could not be loaded.')
      })
    return () => { cancelled = true }
  }, [learner.id])

  const counts = activity || { evidence: 0, reviews: 0, otj: 0, targets: 0, observations: 0 }
  const overviewCards = [
    ['Evidence', counts.evidence],
    ['Reviews', counts.reviews],
    ['OTJ', counts.otj],
    ['Targets', counts.targets],
    ['Course', primaryEnrolment ? 1 : 0],
    ['Observations', counts.observations],
  ]

  return (
    <main className="page-shell">
      <PortalTopbar context={context} email={email} onSignOut={onSignOut} />
      <section className="content learner-overview-content">
        <button className="back-link" type="button" onClick={onBack}>← Learners</button>

        <div className="learner-title-block">
          <p className="eyebrow">Learner overview</p>
          <h1>{learner.displayName}</h1>
          <p className="subtle">{courseText}</p>
          {canAssignCourse && (
            <button className="assign-course-button" type="button" onClick={onAssignCourse}>+ Assign course</button>
          )}
        </div>

        {message && <p className="auth-message error-message learner-message">{message}</p>}

        <div className="learner-stat-grid">
          <div className="learner-stat"><strong>{counts.evidence}</strong><span>Evidence</span></div>
          <div className="learner-stat"><strong>{counts.reviews}</strong><span>Reviews</span></div>
          <div className="learner-stat"><strong>{counts.otj}</strong><span>OTJ entries</span></div>
          <div className="learner-stat"><strong>{counts.targets}</strong><span>Targets</span></div>
        </div>

        <div className="overview-option-grid">
          {overviewCards.map(([label, count]) => {
            const isCourse = label === 'Course'
            const content = (
              <>
                <strong>{label}</strong>
                <span>{isCourse ? (count ? 'Assigned' : 'Not assigned') : `${count} recorded`}</span>
              </>
            )

            if (isCourse && primaryEnrolment) {
              return (
                <button className="overview-option course-option-button" type="button" key={label} onClick={onOpenCourse}>
                  {content}
                </button>
              )
            }

            return <div className="overview-option" key={label}>{content}</div>
          })}
        </div>
      </section>
    </main>
  )
}

function CourseProgressPage({ learner, context, email, onSignOut, onBack }) {
  const enrolment = learner.enrolments[0]
  const [progressData, setProgressData] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!enrolment) return undefined

    loadCourseProgress(enrolment)
      .then((data) => {
        if (!cancelled) setProgressData(data)
      })
      .catch((error) => {
        console.error('Unable to load course progress', error)
        if (!cancelled) setMessage('Course progress could not be loaded.')
      })

    return () => { cancelled = true }
  }, [enrolment?.id])

  if (!enrolment?.course) {
    return <AccessMessage title="No course assigned" message="This learner does not currently have a course enrolment." onSignOut={onSignOut} />
  }

  return (
    <main className="page-shell">
      <PortalTopbar context={context} email={email} onSignOut={onSignOut} />
      <section className="content course-progress-content">
        <button className="back-link" type="button" onClick={onBack}>← Learner</button>

        <div className="learner-title-block">
          <p className="eyebrow">Course</p>
          <h1>{enrolment.course.title}</h1>
          <p className="subtle">{learner.displayName} · {enrolment.course.code}</p>
        </div>

        {message && <p className="auth-message error-message learner-message">{message}</p>}

        {!progressData && !message && (
          <div className="course-progress-hero">
            <div className="progress-value-row">
              <div>
                <div className="progress-value">--</div>
                <div className="progress-label">Course progress</div>
              </div>
              <div className="progress-label">Loading progress…</div>
            </div>
          </div>
        )}

        {progressData && (
          <>
            <div className="course-progress-hero">
              <div className="progress-value-row">
                <div>
                  <div className="progress-value">{progressData.progress}%</div>
                  <div className="progress-label">Course progress</div>
                </div>
                <div className="progress-label">{progressData.completedEvidenceAreas} of {progressData.totalEvidenceAreas} evidence areas completed</div>
              </div>
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${progressData.progress}%` }} />
              </div>
            </div>

            <div className="course-meta-grid">
              <div className="course-meta-card"><strong>{progressData.sections.length}</strong><span>Sections</span></div>
              <div className="course-meta-card"><strong>{progressData.totalCriteria}</strong><span>Criteria</span></div>
            </div>

            <div className="course-section-list">
              {progressData.sections.map((section) => (
                <div className="course-section-card" key={section.id}>
                  <strong>{section.title}</strong>
                  <span>{section.criteriaCount ? `${section.criteriaCount} criteria` : 'No criteria added yet'}</span>
                </div>
              ))}
            </div>
          </>
        )}
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
  const [view, setView] = useState('dashboard')
  const [selectedLearner, setSelectedLearner] = useState(null)

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
        setView('dashboard')
        setSelectedLearner(null)
        clearMFASetup()
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

        clearMFASetup()
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
    clearMFASetup()
    await supabase.auth.signOut()
  }

  function handleMFAVerified() {
    setRefreshKey((value) => value + 1)
  }

  async function refreshDashboardCounts() {
    if (!context) return
    try {
      const nextCounts = await loadDashboardCounts(context.organisation.id)
      setCounts(nextCounts)
    } catch (error) {
      console.error('Unable to refresh dashboard counts', error)
    }
  }

  if (gate === 'loading') return <LoadingScreen />
  if (gate === 'login') return <LoginScreen />
  if (gate === 'mfa' && context) return <MFAScreen existingFactorId={mfaFactorId} onVerified={handleMFAVerified} onSignOut={signOut} />
  if (gate === 'denied') return <AccessMessage title="Access not assigned" message="This account does not have an active Nisia organisation membership and role." onSignOut={signOut} />
  if (gate === 'error') return <AccessMessage title="Unable to load Nisia" message="Your account is signed in, but secure organisation access could not be loaded. Try again shortly." onSignOut={signOut} />

  if (gate === 'ready' && context && counts) {
    if (view === 'courseProgress' && selectedLearner) {
      return (
        <CourseProgressPage
          learner={selectedLearner}
          context={context}
          email={session?.user?.email || ''}
          onSignOut={signOut}
          onBack={() => setView('learner')}
        />
      )
    }

    if (view === 'assignCourse' && selectedLearner) {
      return (
        <CoursesPage
          context={context}
          email={session?.user?.email || ''}
          onSignOut={signOut}
          onBack={() => setView('learner')}
          assignmentLearner={selectedLearner}
          onAssigned={(updatedLearner) => {
            setSelectedLearner(updatedLearner)
            refreshDashboardCounts()
            setView('learner')
          }}
        />
      )
    }

    if (view === 'courses') {
      return (
        <CoursesPage
          context={context}
          email={session?.user?.email || ''}
          onSignOut={signOut}
          onBack={() => setView('dashboard')}
          assignmentLearner={null}
          onAssigned={() => {}}
        />
      )
    }

    if (view === 'learner' && selectedLearner) {
      return (
        <LearnerOverviewPage
          learner={selectedLearner}
          context={context}
          email={session?.user?.email || ''}
          onSignOut={signOut}
          onBack={() => setView('learners')}
          onAssignCourse={() => setView('assignCourse')}
          onOpenCourse={() => setView('courseProgress')}
        />
      )
    }

    if (view === 'learners') {
      return (
        <LearnersPage
          context={context}
          email={session?.user?.email || ''}
          onSignOut={signOut}
          onBack={() => setView('dashboard')}
          onLearnerCreated={refreshDashboardCounts}
          onOpenLearner={(learner) => {
            setSelectedLearner(learner)
            setView('learner')
          }}
        />
      )
    }

    return (
      <Dashboard
        context={context}
        counts={counts}
        email={session?.user?.email || ''}
        onSignOut={signOut}
        onOpenLearners={() => setView('learners')}
        onOpenCourses={() => setView('courses')}
      />
    )
  }

  return <LoadingScreen />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

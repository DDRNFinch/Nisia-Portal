import { createClient } from '@supabase/supabase-js'

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

let rendering = false

function make(tag, className, text) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

function ensureStyles() {
  if (document.getElementById('nisia-functional-test-styles')) return
  const style = document.createElement('style')
  style.id = 'nisia-functional-test-styles'
  style.textContent = `
    .nisia-functional-criteria { margin-top: 14px; display: grid; gap: 10px; }
    .nisia-functional-row { border-top: 1px solid rgba(30,30,30,.10); padding-top: 12px; display: grid; gap: 7px; }
    .nisia-functional-row:first-child { border-top: 0; }
    .nisia-functional-meta { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .58; }
    .nisia-functional-description { font-size: 14px; line-height: 1.4; opacity: .78; }
    .nisia-functional-state { font-size: 13px; font-weight: 700; }
    .nisia-functional-action { border: 0; border-radius: 999px; padding: 10px 14px; font: inherit; font-size: 13px; font-weight: 800; background: #242424; color: #fff; justify-self: start; }
    .nisia-functional-action[data-mapped="true"] { background: #ece8df; color: #242424; }
    .nisia-functional-action:disabled { opacity: .55; }
    .nisia-functional-message { margin: 12px 0 0; font-size: 13px; line-height: 1.4; }
    .nisia-evia-link-wrap { margin-top: 12px; display: grid; gap: 9px; justify-items: start; }
    .nisia-evia-link-button { border: 0; border-radius: 999px; padding: 10px 15px; background: #242424; color: #fff; font: inherit; font-size: 13px; font-weight: 800; }
    .nisia-evia-link-button:disabled { opacity: .55; }
    .nisia-evia-code { border: 1px solid rgba(30,30,30,.12); border-radius: 16px; padding: 12px 14px; background: #fff; display: grid; gap: 6px; }
    .nisia-evia-code strong { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; letter-spacing: .06em; }
    .nisia-evia-code span { font-size: 12px; opacity: .64; line-height: 1.4; }
  `
  document.head.appendChild(style)
}

async function callerOrganisation() {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (!user) throw new Error('No authenticated session.')
  const { data: callerMembership, error: callerError } = await supabase
    .from('organisation_members')
    .select('id, organisation_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (callerError || !callerMembership) throw callerError || new Error('No active organisation membership.')
  return { user, membership: callerMembership }
}

async function resolveCourseContext(scope) {
  const subtitle = scope.querySelector('.learner-title-block .subtle')?.textContent || ''
  const parts = subtitle.split('·').map((part) => part.trim()).filter(Boolean)
  const learnerName = parts[0] || ''
  const courseCode = parts[1] || ''
  if (!learnerName || !courseCode) throw new Error('Could not identify the learner/course shown on this page.')

  const { membership: callerMembership } = await callerOrganisation()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', learnerName)
    .limit(1)
    .maybeSingle()
  if (profileError || !profile) throw profileError || new Error('Learner profile not found.')

  const { data: learnerMember, error: learnerMemberError } = await supabase
    .from('organisation_members')
    .select('id')
    .eq('organisation_id', callerMembership.organisation_id)
    .eq('user_id', profile.id)
    .limit(1)
    .maybeSingle()
  if (learnerMemberError || !learnerMember) throw learnerMemberError || new Error('Learner membership not found.')

  const { data: learner, error: learnerError } = await supabase
    .from('learners')
    .select('id')
    .eq('organisation_id', callerMembership.organisation_id)
    .eq('organisation_member_id', learnerMember.id)
    .limit(1)
    .maybeSingle()
  if (learnerError || !learner) throw learnerError || new Error('Learner record not found.')

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, code, title')
    .eq('code', courseCode)
    .limit(1)
    .maybeSingle()
  if (courseError || !course) throw courseError || new Error('Course not found.')

  const { data: enrolment, error: enrolmentError } = await supabase
    .from('enrolments')
    .select('id, course_id')
    .eq('organisation_id', callerMembership.organisation_id)
    .eq('learner_id', learner.id)
    .eq('course_id', course.id)
    .limit(1)
    .maybeSingle()
  if (enrolmentError || !enrolment) throw enrolmentError || new Error('Enrolment not found.')

  return { enrolment, course }
}

async function loadFunctionalData(scope) {
  const context = await resolveCourseContext(scope)

  const [{ data: sections, error: sectionError }, { data: criteria, error: criteriaError }] = await Promise.all([
    supabase
      .from('course_sections')
      .select('id, title, position')
      .eq('course_id', context.course.id)
      .order('position', { ascending: true }),
    supabase
      .from('criteria')
      .select('id, section_id, code, criterion_type, description, position')
      .eq('course_id', context.course.id)
      .order('position', { ascending: true }),
  ])
  if (sectionError) throw sectionError
  if (criteriaError) throw criteriaError

  const { data: evidence, error: evidenceError } = await supabase
    .from('evidence')
    .select('id')
    .eq('enrolment_id', context.enrolment.id)
    .eq('title', 'Nisia functional test evidence')
    .limit(1)
    .maybeSingle()
  if (evidenceError) throw evidenceError

  const { data: mappings, error: mappingError } = evidence
    ? await supabase
        .from('evidence_criteria')
        .select('criterion_id')
        .eq('evidence_id', evidence.id)
        .eq('course_id', context.course.id)
    : { data: [], error: null }
  if (mappingError) throw mappingError

  return {
    ...context,
    sections: sections || [],
    criteria: criteria || [],
    mapped: new Set((mappings || []).map((row) => row.criterion_id)),
  }
}

function updateExistingProgress(scope, data) {
  const total = data.criteria.length
  const evidenced = data.criteria.filter((criterion) => data.mapped.has(criterion.id)).length
  const percent = total ? Math.round((evidenced / total) * 100) : 0

  const progressValue = scope.querySelector('.progress-value')
  if (progressValue) progressValue.textContent = `${percent}%`

  const labels = scope.querySelectorAll('.course-progress-hero .progress-label')
  if (labels.length > 1) labels[1].textContent = `${evidenced} of ${total} criteria evidenced`

  const fill = scope.querySelector('.progress-fill')
  if (fill) fill.style.width = `${percent}%`

  const metaCards = scope.querySelectorAll('.course-meta-card')
  if (metaCards.length > 1) {
    const strong = metaCards[1].querySelector('strong')
    if (strong) strong.textContent = String(total)
  }
}

async function toggleMapping(button, data, criterion) {
  const mapped = data.mapped.has(criterion.id)
  button.disabled = true
  button.textContent = mapped ? 'Removing…' : 'Mapping…'

  const { error } = await supabase.functions.invoke('admin-toggle-test-evidence', {
    body: {
      enrolment_id: data.enrolment.id,
      criterion_id: criterion.id,
      action: mapped ? 'unmap' : 'map',
    },
  })

  if (error) {
    button.disabled = false
    button.textContent = mapped ? 'Remove test evidence' : 'Map test evidence'
    const message = make('div', 'nisia-functional-message', 'This account was not allowed to change the evidence mapping.')
    button.parentElement?.appendChild(message)
    return
  }

  await renderHarness(document.querySelector('.course-progress-content'))
}

async function renderHarness(scope) {
  if (!scope || rendering) return
  rendering = true
  ensureStyles()

  try {
    const data = await loadFunctionalData(scope)
    updateExistingProgress(scope, data)

    scope.querySelectorAll('.nisia-functional-criteria').forEach((node) => node.remove())

    for (const section of data.sections) {
      const sectionCard = [...scope.querySelectorAll('.course-section-card')]
        .find((card) => card.querySelector('strong')?.textContent?.trim() === section.title)
      if (!sectionCard) continue

      const sectionCriteria = data.criteria.filter((criterion) => criterion.section_id === section.id)
      const evidencedCount = sectionCriteria.filter((criterion) => data.mapped.has(criterion.id)).length
      const summary = sectionCard.querySelector(':scope > span')
      if (summary) summary.textContent = `${sectionCriteria.length} criteria · ${evidencedCount} evidenced`

      const list = make('div', 'nisia-functional-criteria')
      list.dataset.functionalHarness = 'true'

      for (const criterion of sectionCriteria) {
        const row = make('div', 'nisia-functional-row')
        row.appendChild(make('div', 'nisia-functional-meta', `${criterion.code || '—'} · ${criterion.criterion_type.replace('_', ' ')}`))
        row.appendChild(make('div', 'nisia-functional-description', criterion.description))

        const mapped = data.mapped.has(criterion.id)
        row.appendChild(make('div', 'nisia-functional-state', mapped ? 'Evidenced' : 'Not evidenced'))

        const action = make('button', 'nisia-functional-action', mapped ? 'Remove test evidence' : 'Map test evidence')
        action.type = 'button'
        action.dataset.mapped = String(mapped)
        action.addEventListener('click', () => toggleMapping(action, data, criterion))
        row.appendChild(action)
        list.appendChild(row)
      }

      sectionCard.appendChild(list)
    }
  } catch (error) {
    console.error('Nisia functional criteria harness failed', error)
  } finally {
    rendering = false
  }
}

async function resolveLearnerForPairing(scope) {
  const learnerName = scope.querySelector('.learner-title-block h1')?.textContent?.trim() || ''
  if (!learnerName) throw new Error('Could not identify this learner.')
  const { membership } = await callerOrganisation()
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id').eq('display_name', learnerName)
  if (profileError) throw profileError
  const userIds = (profiles || []).map((profile) => profile.id)
  if (!userIds.length) throw new Error('Learner profile not found.')
  const { data: members, error: memberError } = await supabase
    .from('organisation_members')
    .select('id, user_id')
    .eq('organisation_id', membership.organisation_id)
    .eq('active', true)
    .in('user_id', userIds)
  if (memberError) throw memberError
  const memberIds = (members || []).map((member) => member.id)
  if (!memberIds.length) throw new Error('Learner membership not found.')
  const { data: learners, error: learnerError } = await supabase
    .from('learners')
    .select('id')
    .eq('organisation_id', membership.organisation_id)
    .in('organisation_member_id', memberIds)
    .limit(1)
  if (learnerError || !learners?.length) throw learnerError || new Error('Learner record not found.')
  return { organisationId: membership.organisation_id, learnerId: learners[0].id }
}

async function createEviaPairing(scope, button, output) {
  button.disabled = true
  button.textContent = 'Creating…'
  output.replaceChildren()
  try {
    const learner = await resolveLearnerForPairing(scope)
    const { data, error } = await supabase.functions.invoke('admin-create-evia-pairing', {
      body: { organisation_id: learner.organisationId, learner_id: learner.learnerId },
    })
    if (error || !data?.pairing_code) throw error || new Error('Pairing code was not returned.')
    const card = make('div', 'nisia-evia-code')
    card.appendChild(make('span', '', 'Enter this once in Evia → Connect Nisia'))
    card.appendChild(make('strong', '', data.pairing_code))
    card.appendChild(make('span', '', 'Expires in 10 minutes and can only be used once.'))
    const copy = make('button', 'nisia-functional-action', 'Copy code')
    copy.type = 'button'
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(data.pairing_code); copy.textContent = 'Copied' } catch { copy.textContent = 'Copy unavailable' }
    })
    card.appendChild(copy)
    output.appendChild(card)
  } catch (error) {
    console.error('Could not create Evia pairing', error)
    output.appendChild(make('div', 'nisia-functional-message', 'Evia pairing could not be created. Admin access and MFA are required.'))
  } finally {
    button.disabled = false
    button.textContent = 'Connect Evia'
  }
}

function mountEviaPairing() {
  const scope = document.querySelector('.learner-overview-content')
  if (!scope || scope.querySelector('[data-evia-pairing-control]')) return
  ensureStyles()
  const titleBlock = scope.querySelector('.learner-title-block')
  if (!titleBlock) return
  const wrap = make('div', 'nisia-evia-link-wrap')
  wrap.dataset.eviaPairingControl = 'true'
  const button = make('button', 'nisia-evia-link-button', 'Connect Evia')
  button.type = 'button'
  const output = make('div', '')
  button.addEventListener('click', () => createEviaPairing(scope, button, output))
  wrap.append(button, output)
  titleBlock.appendChild(wrap)
}

function maybeMount() {
  const scope = document.querySelector('.course-progress-content')
  if (scope && !scope.querySelector('.nisia-functional-criteria')) renderHarness(scope)
  mountEviaPairing()
}

const observer = new MutationObserver(() => maybeMount())
observer.observe(document.documentElement, { childList: true, subtree: true })
maybeMount()
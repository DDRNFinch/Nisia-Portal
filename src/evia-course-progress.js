import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ffgfigkeeeauzkifopei.supabase.co',
  'sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)

let currentSignature = ''
let currentResult = null
let loadPromise = null
let scheduled = false

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function pathKey(path) {
  return JSON.stringify((Array.isArray(path) ? path : []).map(clean).filter(Boolean))
}

function evidenceCounts(rows) {
  const counts = { photo: 0, video: 0, audio: 0, written: 0, document: 0, other: 0 }
  for (const row of rows) {
    const type = clean(row?.evidence_type).toLowerCase()
    if (Object.prototype.hasOwnProperty.call(counts, type)) counts[type] += 1
    else counts.other += 1
  }
  return counts
}

function methodSatisfied(label, rows) {
  const text = clean(label).toLowerCase().replace(/[–—]/g, '-')
  if (!text || !rows.length) return false

  const counts = evidenceCounts(rows)
  const has = (type) => counts[type] > 0

  if (text.includes(' or ')) {
    const options = text.split(/\s+or\s+/).map((part) => part.trim()).filter(Boolean)
    if (options.length > 1) return options.some((option) => methodSatisfied(option, rows))
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

function completedEvidencePaths(evidenceRows) {
  const byPath = new Map()

  for (const row of evidenceRows || []) {
    const metadata = row?.source_metadata && typeof row.source_metadata === 'object' ? row.source_metadata : {}
    if (clean(metadata.source).toLowerCase() !== 'evia') continue
    const key = pathKey(metadata.path)
    if (key === '[]') continue
    if (!byPath.has(key)) byPath.set(key, [])
    byPath.get(key).push(row)
  }

  const completed = new Set()
  for (const [key, rows] of byPath) {
    const byMethod = new Map()
    for (const row of rows) {
      const label = clean(row?.source_metadata?.method?.label)
      if (!byMethod.has(label)) byMethod.set(label, [])
      byMethod.get(label).push(row)
    }
    if ([...byMethod].some(([label, methodRows]) => methodSatisfied(label, methodRows))) completed.add(key)
  }

  return completed
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Course mapping request failed (${response.status})`)
  return response.json()
}

async function loadKsbMappings(pointer) {
  const packUrl = clean(pointer?.packUrl)
  if (!packUrl) throw new Error('Course mapping pack is unavailable')
  if (pointer?.patch || pointer?.customisations) throw new Error('Customised mapping needs its published course structure')

  const pack = await fetchJson(packUrl)
  if (clean(pack?.courseType).toLowerCase() !== 'ksb') throw new Error('This course does not use KSB mapping')

  const packDir = new URL('./', packUrl)
  const categoryUrls = (pack.categoryFiles || []).map((file) => new URL(file, packDir).href)
  const categories = await Promise.all(categoryUrls.map(fetchJson))
  const mappings = new Map()

  for (const category of categories) {
    const categoryTitle = clean(category?.title)
    for (const subcategory of category?.subcategories || []) {
      const subcategoryTitle = clean(subcategory?.title)
      for (const task of subcategory?.tasks || []) {
        const taskTitle = clean(task?.title)
        if (!categoryTitle || !subcategoryTitle || !taskTitle) continue
        const key = pathKey([categoryTitle, subcategoryTitle, taskTitle])
        for (const rawCode of task?.ksbTargets || []) {
          const code = clean(rawCode)
          if (!code) continue
          if (!mappings.has(code)) mappings.set(code, new Set())
          mappings.get(code).add(key)
        }
      }
    }
  }

  return mappings
}

function pageIdentity(scope) {
  const titleBlock = scope.querySelector('.learner-title-block')
  const subtitle = clean(titleBlock?.querySelector('.subtle')?.textContent)
  const splitAt = subtitle.lastIndexOf('·')
  if (splitAt < 0) return null
  const learnerName = clean(subtitle.slice(0, splitAt))
  const courseCode = clean(subtitle.slice(splitAt + 1))
  if (!learnerName || !courseCode) return null
  return { learnerName, courseCode, signature: `${learnerName}::${courseCode}` }
}

async function resolveCourseContext(identity) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id
  if (!userId) throw new Error('Not signed in')

  const [{ data: membership, error: membershipError }, { data: course, error: courseError }] = await Promise.all([
    supabase
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('id, code, source_pointer')
      .eq('code', identity.courseCode)
      .limit(1)
      .maybeSingle(),
  ])

  if (membershipError || !membership) throw membershipError || new Error('Membership not found')
  if (courseError || !course) throw courseError || new Error('Course not found')

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', identity.learnerName)
  if (profileError || !profiles?.length) throw profileError || new Error('Profile not found')

  const { data: members, error: memberError } = await supabase
    .from('organisation_members')
    .select('id')
    .eq('organisation_id', membership.organisation_id)
    .eq('active', true)
    .in('user_id', profiles.map((profile) => profile.id))
  if (memberError || !members?.length) throw memberError || new Error('Learner membership not found')

  const { data: learners, error: learnerError } = await supabase
    .from('learners')
    .select('id')
    .eq('organisation_id', membership.organisation_id)
    .in('organisation_member_id', members.map((member) => member.id))
    .limit(1)
  if (learnerError || !learners?.length) throw learnerError || new Error('Learner record not found')

  const { data: enrolment, error: enrolmentError } = await supabase
    .from('enrolments')
    .select('id')
    .eq('organisation_id', membership.organisation_id)
    .eq('learner_id', learners[0].id)
    .eq('course_id', course.id)
    .limit(1)
    .maybeSingle()
  if (enrolmentError || !enrolment) throw enrolmentError || new Error('Enrolment not found')

  return { course, enrolment }
}

async function calculateProgress(identity) {
  const { course, enrolment } = await resolveCourseContext(identity)
  const [{ data: criteria, error: criteriaError }, { data: evidenceRows, error: evidenceError }, mappings] = await Promise.all([
    supabase.from('criteria').select('id, code').eq('course_id', course.id),
    supabase.from('evidence').select('id, evidence_type, source_metadata').eq('enrolment_id', enrolment.id),
    loadKsbMappings(course.source_pointer),
  ])

  if (criteriaError) throw criteriaError
  if (evidenceError) throw evidenceError

  const completedPaths = completedEvidencePaths(evidenceRows || [])
  const courseCriteria = criteria || []
  let completed = 0

  for (const criterion of courseCriteria) {
    const paths = mappings.get(clean(criterion.code))
    if (!paths?.size) continue
    if ([...paths].every((key) => completedPaths.has(key))) completed += 1
  }

  const total = courseCriteria.length
  const progress = total ? Math.round((completed / total) * 100) : 0
  return { completed, total, progress }
}

function applyResult(scope, result) {
  const value = scope.querySelector('.course-progress-hero .progress-value')
  const labels = scope.querySelectorAll('.course-progress-hero .progress-value-row .progress-label')
  const fill = scope.querySelector('.course-progress-hero .progress-fill')

  if (value && value.textContent !== `${result.progress}%`) value.textContent = `${result.progress}%`
  if (labels[1] && labels[1].textContent !== `${result.completed} of ${result.total} criteria evidenced`) {
    labels[1].textContent = `${result.completed} of ${result.total} criteria evidenced`
  }
  if (fill && fill.style.width !== `${result.progress}%`) fill.style.width = `${result.progress}%`
}

async function refresh() {
  scheduled = false
  const scope = document.querySelector('.course-progress-content')
  if (!scope) {
    currentSignature = ''
    currentResult = null
    loadPromise = null
    return
  }

  const identity = pageIdentity(scope)
  if (!identity) return

  if (identity.signature !== currentSignature) {
    currentSignature = identity.signature
    currentResult = null
    loadPromise = calculateProgress(identity)
      .then((result) => {
        if (currentSignature === identity.signature) currentResult = result
        return result
      })
      .catch((error) => {
        console.error('Evia-aligned course progress unavailable', error)
        return null
      })
      .finally(() => {
        if (currentSignature === identity.signature) loadPromise = null
      })
  }

  if (currentResult) {
    applyResult(scope, currentResult)
    return
  }

  if (loadPromise) {
    const result = await loadPromise
    const currentScope = document.querySelector('.course-progress-content')
    if (result && currentScope && currentSignature === identity.signature) applyResult(currentScope, result)
  }
}

function scheduleRefresh() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(refresh)
}

new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList: true, subtree: true })
scheduleRefresh()

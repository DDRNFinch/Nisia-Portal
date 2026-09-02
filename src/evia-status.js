import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

const supabase = createClient(
  'https://ffgfigkeeeauzkifopei.supabase.co',
  'sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function addStyles() {
  if (document.getElementById('nisia-evia-status-styles')) return
  const style = document.createElement('style')
  style.id = 'nisia-evia-status-styles'
  style.textContent = `
    .nisia-evia-wrap{margin-top:12px;display:grid;gap:8px;justify-items:start}
    .nisia-evia-button,.nisia-evia-copy{border:0;border-radius:999px;padding:10px 15px;background:#242424;color:#fff;font:inherit;font-size:13px;font-weight:800}
    .nisia-evia-button:disabled{opacity:.55}
    .nisia-evia-connected{border-radius:999px;padding:10px 15px;background:#ece8df;color:#242424;font-size:13px;font-weight:800}
    .nisia-evia-note{font-size:12px;opacity:.64;line-height:1.4}
    .nisia-evia-code{border:1px solid rgba(30,30,30,.12);border-radius:18px;padding:14px;background:#fff;display:grid;gap:10px;justify-items:start}
    .nisia-evia-code strong{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;letter-spacing:.06em;overflow-wrap:anywhere}
    .nisia-evia-qr{width:min(220px,72vw);height:auto;display:block;border-radius:14px;background:#fff}
    .nisia-evia-fallback{display:grid;gap:6px;width:100%;padding-top:4px;border-top:1px solid rgba(30,30,30,.08)}
  `
  document.head.appendChild(style)
}

async function resolveLearner(scope) {
  const learnerName = scope.querySelector('.learner-title-block h1')?.textContent?.trim()
  if (!learnerName) throw new Error('Learner not found')

  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('Not signed in')

  const { data: membership, error: membershipError } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (membershipError || !membership) throw membershipError || new Error('Membership not found')

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', learnerName)
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

  return { organisation_id: membership.organisation_id, learner_id: learners[0].id }
}

async function request(learner, action) {
  const { data, error } = await supabase.functions.invoke('admin-create-evia-pairing', {
    body: { ...learner, action },
  })
  if (error) throw error
  return data || {}
}

function showConnected(wrap, connectedAt) {
  wrap.replaceChildren(el('div', 'nisia-evia-connected', 'Evia connected'))
  if (connectedAt) {
    const date = new Date(connectedAt)
    if (!Number.isNaN(date.getTime())) wrap.appendChild(el('div', 'nisia-evia-note', `Connected ${date.toLocaleString()}`))
  }
}

async function createPairing(wrap, learner) {
  const button = wrap.querySelector('button')
  button.disabled = true
  button.textContent = 'Creating…'
  try {
    const data = await request(learner, 'create')
    if (!data.pairing_code || !data.expires_at) throw new Error('No pairing code')

    const qrPayload = JSON.stringify({ type: 'nisia-evia-pairing-v1', pairing_code: data.pairing_code })
    const qrUrl = await QRCode.toDataURL(qrPayload, { width: 320, margin: 1, errorCorrectionLevel: 'M' })

    wrap.replaceChildren()
    const card = el('div', 'nisia-evia-code')
    card.appendChild(el('span', 'nisia-evia-note', 'Open Evia → Connect Nisia → Scan Nisia QR'))
    const image = el('img', 'nisia-evia-qr')
    image.src = qrUrl
    image.alt = 'One-time Evia connection QR code'
    card.appendChild(image)
    card.appendChild(el('span', 'nisia-evia-note', 'Expires in 10 minutes and can only be used once.'))

    const fallback = el('div', 'nisia-evia-fallback')
    fallback.append(el('span', 'nisia-evia-note', 'Manual code fallback'), el('strong', '', data.pairing_code))
    const copy = el('button', 'nisia-evia-copy', 'Copy code')
    copy.type = 'button'
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(data.pairing_code); copy.textContent = 'Copied' } catch { copy.textContent = 'Copy unavailable' }
    }
    fallback.appendChild(copy)
    card.appendChild(fallback)
    wrap.appendChild(card)

    const expires = new Date(data.expires_at).getTime()
    const timer = window.setInterval(async () => {
      if (!wrap.isConnected || Date.now() > expires) return window.clearInterval(timer)
      try {
        const status = await request(learner, 'status')
        if (status.connected) {
          window.clearInterval(timer)
          showConnected(wrap, status.last_connected_at)
        }
      } catch {}
    }, 3000)
  } catch (error) {
    console.error('Evia pairing failed', error)
    button.disabled = false
    button.textContent = 'Connect Evia'
  }
}

async function mount() {
  const scope = document.querySelector('.learner-overview-content')
  if (!scope || scope.querySelector('[data-evia-status]')) return
  const title = scope.querySelector('.learner-title-block')
  if (!title) return

  addStyles()
  const wrap = el('div', 'nisia-evia-wrap')
  wrap.dataset.eviaStatus = 'true'
  wrap.appendChild(el('div', 'nisia-evia-note', 'Checking Evia connection…'))
  title.appendChild(wrap)

  try {
    const learner = await resolveLearner(scope)
    const status = await request(learner, 'status')
    if (!wrap.isConnected) return
    if (status.connected) return showConnected(wrap, status.last_connected_at)

    wrap.replaceChildren()
    const button = el('button', 'nisia-evia-button', 'Connect Evia')
    button.type = 'button'
    button.onclick = () => createPairing(wrap, learner)
    wrap.appendChild(button)
  } catch (error) {
    console.error('Evia status failed', error)
    if (wrap.isConnected) wrap.replaceChildren(el('div', 'nisia-evia-note', 'Evia connection status unavailable.'))
  }
}

new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true })
mount()

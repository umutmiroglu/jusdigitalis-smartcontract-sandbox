import type { AnalyticsEventName, ABVariant } from '../types'

const ANALYTICS_URL = '/api/sandbox-analytics'
const SIM_LOG_KEY   = 'jd_sim_log'
const SIM_LOG_MAX   = 100
const AB_KEY        = 'jd_ab'
const QUEUE_KEY     = 'jd_aq'

let _queue: object[] = []
let _sessionId: string | null = null

// Startup: flush any queued events from previous sessions
try {
  const raw = localStorage.getItem(QUEUE_KEY)
  if (raw) { _queue = JSON.parse(raw) as object[]; flush() }
} catch {}

function flush(): void {
  if (!_queue.length) return
  const batch = [..._queue]
  _queue = []
  try { localStorage.removeItem(QUEUE_KEY) } catch {}
  fetch(ANALYTICS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ events: batch }),
  }).catch(() => {
    _queue = [...batch, ..._queue]
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(_queue)) } catch {}
  })
}

export function track(eventName: AnalyticsEventName, data: Record<string, unknown> = {}): void {
  _queue.push({ event: eventName, ts: Date.now(), ...data })
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(_queue)) } catch {}
  flush()
}

export function logSimulation(data: Record<string, unknown>): void {
  const sessionId = getSessionId()
  const entry = { ts: Date.now(), sessionId, ...data }
  try {
    const raw = localStorage.getItem(SIM_LOG_KEY)
    const log: object[] = raw ? JSON.parse(raw) as object[] : []
    log.push(entry)
    if (log.length > SIM_LOG_MAX) log.splice(0, log.length - SIM_LOG_MAX)
    localStorage.setItem(SIM_LOG_KEY, JSON.stringify(log))
  } catch {}
  track('SIM_DATA', entry)
}

function getSessionId(): string {
  if (!_sessionId) _sessionId = Math.random().toString(36).slice(2, 10).toUpperCase()
  return _sessionId
}

export function getABVariant(): ABVariant {
  try {
    const v = localStorage.getItem(AB_KEY) as ABVariant | null
    if (v) return v
  } catch {}
  const variants: ABVariant[] = ['forceClassicFirst', 'freeChoice', 'aiAdvisorProminent']
  const v = variants[Math.floor(Math.random() * 3)]
  try { localStorage.setItem(AB_KEY, v) } catch {}
  return v
}

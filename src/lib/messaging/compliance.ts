import type { Channel, MessageCategory, AudienceContact } from './types'

// ── Normalization ───────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().toLowerCase()
  return EMAIL_RE.test(v) ? v : null
}

/** Returns E.164 digits without '+', e.g. "971501234567", or null if implausible. */
export function normalizePhone(raw: string | null | undefined, defaultCountryCode = '971'): string | null {
  let v = (raw ?? '').trim()
  if (!v) return null
  const hasPlus = v.startsWith('+')
  v = v.replace(/\D/g, '')
  if (!v) return null
  if (!hasPlus) {
    if (v.startsWith('00')) v = v.slice(2)
    else if (v.startsWith('0')) v = defaultCountryCode + v.slice(1)
    else if (v.length <= 9) v = defaultCountryCode + v
  }
  return v.length >= 8 && v.length <= 15 ? v : null
}

export function addressFor(channel: Channel, contact: Pick<AudienceContact, 'email' | 'phone'>): string | null {
  return channel === 'email' ? normalizeEmail(contact.email) : normalizePhone(contact.phone)
}

// ── Consent / eligibility ───────────────────────────────────────────────────

export type Eligibility = { ok: true } | { ok: false; reason: string }

/**
 * Marketing email: needs explicit opt-in or an existing business relationship
 * ('implied', attested by the admin on import). Cold 'unknown' contacts are
 * blocked — that is exactly what drives spam complaints and blocklisting.
 * Marketing WhatsApp: Meta requires explicit opt-in. No exceptions.
 * Utility messages (replies, appointment/lead follow-ups) only need the
 * contact not to have opted out.
 */
export function checkEligibility(
  channel: Channel,
  category: MessageCategory,
  contact: AudienceContact,
  suppressed: boolean,
): Eligibility {
  const address = addressFor(channel, contact)
  if (!address) return { ok: false, reason: channel === 'email' ? 'invalid_email' : 'invalid_phone' }
  if (suppressed) return { ok: false, reason: 'suppressed' }

  const consent = channel === 'email' ? contact.email_consent : contact.whatsapp_consent
  if (consent === 'opted_out') return { ok: false, reason: 'opted_out' }

  if (category === 'marketing') {
    if (channel === 'whatsapp' && consent !== 'opted_in') return { ok: false, reason: 'no_whatsapp_opt_in' }
    if (channel === 'email' && consent !== 'opted_in' && consent !== 'implied') return { ok: false, reason: 'no_email_consent' }
  }
  return { ok: true }
}

// ── WhatsApp 24h customer-service window ────────────────────────────────────

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Free-form WhatsApp text is only allowed within 24h of the customer's last message. */
export function isWithinServiceWindow(lastInboundAt: string | null | undefined, now: Date): boolean {
  if (!lastInboundAt) return false
  return now.getTime() - new Date(lastInboundAt).getTime() < SERVICE_WINDOW_MS
}

// ── Sending hours (UAE Cabinet Resolution 56/2024: marketing 09:00–18:00) ───

export interface SendWindow { startHour: number; endHour: number; timeZone: string }

export const DEFAULT_SEND_WINDOW: SendWindow = { startHour: 9, endHour: 18, timeZone: 'Asia/Dubai' }

export function localHour(now: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now)
  return Number(h)
}

export function isWithinSendWindow(now: Date, window: SendWindow = DEFAULT_SEND_WINDOW): boolean {
  const h = localHour(now, window.timeZone)
  return h >= window.startHour && h < window.endHour
}

// ── Volume caps ─────────────────────────────────────────────────────────────

/**
 * Email domain warm-up: a new sending domain that suddenly sends thousands of
 * emails looks like a spammer. Ramp daily volume up over ~4 weeks.
 */
const EMAIL_WARMUP: Array<[maxDay: number, cap: number]> = [
  [3, 50], [7, 100], [14, 250], [21, 500], [28, 1000],
]

export function emailDailyCap(firstSendAt: string | null, now: Date, maxCap: number): number {
  if (!firstSendAt) return Math.min(EMAIL_WARMUP[0][1], maxCap)
  const day = Math.floor((now.getTime() - new Date(firstSendAt).getTime()) / 86_400_000) + 1
  for (const [maxDay, cap] of EMAIL_WARMUP) if (day <= maxDay) return Math.min(cap, maxCap)
  return maxCap
}

/** Remaining sends allowed right now given what was sent in the trailing 24h. */
export function remainingCapacity(cap: number, sentLast24h: number): number {
  return Math.max(0, cap - sentLast24h)
}

// ── Health circuit breaker ──────────────────────────────────────────────────

export interface ChannelHealth { attempted: number; bounced: number; complained: number; failed: number }

export const HEALTH_THRESHOLDS = {
  minSample: 50,
  maxBounceRate: 0.02,      // >2% hard bounces = dirty list
  maxComplaintRate: 0.001,  // Gmail healthy target 0.1% (hard ceiling 0.3%)
  maxFailRate: 0.1,         // WhatsApp: >10% failures = number at risk
}

/** Returns a reason string if sending must pause, otherwise null. */
export function healthBreaker(channel: Channel, h: ChannelHealth | null | undefined): string | null {
  if (!h || h.attempted < HEALTH_THRESHOLDS.minSample) return null
  if (channel === 'email') {
    const bounce = h.bounced / h.attempted
    const complaint = h.complained / h.attempted
    if (complaint > HEALTH_THRESHOLDS.maxComplaintRate) return `Spam complaint rate ${(complaint * 100).toFixed(2)}% exceeds 0.1%`
    if (bounce > HEALTH_THRESHOLDS.maxBounceRate) return `Bounce rate ${(bounce * 100).toFixed(1)}% exceeds 2%`
  } else {
    const fail = h.failed / h.attempted
    if (fail > HEALTH_THRESHOLDS.maxFailRate) return `WhatsApp failure rate ${(fail * 100).toFixed(1)}% exceeds 10%`
  }
  return null
}

// ── Opt-out / opt-in keywords (English + Arabic) ────────────────────────────

const OPT_OUT = ['stop', 'unsubscribe', 'stop all', 'cancel', 'end', 'quit', 'opt out', 'optout', 'remove me',
  'توقف', 'إيقاف', 'ايقاف', 'إلغاء', 'الغاء', 'إلغاء الاشتراك', 'الغاء الاشتراك']
// Deliberately excludes "yes" — a casual "yes" to an agent's question is not consent.
const OPT_IN = ['start', 'subscribe', 'opt in', 'optin', 'اشتراك']

function cleanKeyword(text: string): string {
  return text.trim().toLowerCase().replace(/[.!؟?،,\s]+$/, '').replace(/\s+/g, ' ')
}

export function isOptOutMessage(text: string | null | undefined): boolean {
  if (!text) return false
  return OPT_OUT.includes(cleanKeyword(text))
}

export function isOptInMessage(text: string | null | undefined): boolean {
  if (!text) return false
  return OPT_IN.includes(cleanKeyword(text))
}

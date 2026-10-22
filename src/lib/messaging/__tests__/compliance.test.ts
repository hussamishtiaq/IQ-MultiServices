import { describe, expect, it } from 'vitest'
import {
  checkEligibility, emailDailyCap, healthBreaker, isOptInMessage, isOptOutMessage, isWithinSendWindow,
  isWithinServiceWindow, normalizeEmail, normalizePhone, remainingCapacity,
} from '../compliance'
import { makeContact } from './memory-store'

describe('normalizePhone', () => {
  it.each([
    ['+971 50 123 4567', '971501234567'],
    ['0501234567', '971501234567'],
    ['501234567', '971501234567'],
    ['00971501234567', '971501234567'],
    ['971501234567', '971501234567'],
    ['+44 20 7946 0958', '442079460958'],
  ])('%s → %s', (raw, expected) => expect(normalizePhone(raw)).toBe(expected))

  it('rejects junk', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
    expect(normalizePhone('+12')).toBeNull()
  })

  it('uses provided default country code', () => {
    expect(normalizePhone('07911123456', '44')).toBe('447911123456')
  })
})

describe('normalizeEmail', () => {
  it('lowercases and trims', () => expect(normalizeEmail('  Jane@Example.COM ')).toBe('jane@example.com'))
  it('rejects invalid', () => {
    expect(normalizeEmail('not-an-email')).toBeNull()
    expect(normalizeEmail('a@b')).toBeNull()
  })
})

describe('checkEligibility', () => {
  const email = 'a@b.com'
  const phone = '971501234567'

  it('blocks cold (unknown consent) marketing email — the main cause of blocklisting', () => {
    const c = makeContact({ email, email_consent: 'unknown' })
    expect(checkEligibility('email', 'marketing', c, false)).toEqual({ ok: false, reason: 'no_email_consent' })
  })
  it('allows marketing email with opt-in or existing relationship', () => {
    expect(checkEligibility('email', 'marketing', makeContact({ email, email_consent: 'opted_in' }), false).ok).toBe(true)
    expect(checkEligibility('email', 'marketing', makeContact({ email, email_consent: 'implied' }), false).ok).toBe(true)
  })
  it('requires explicit opt-in for WhatsApp marketing (Meta policy)', () => {
    expect(checkEligibility('whatsapp', 'marketing', makeContact({ phone, whatsapp_consent: 'unknown' }), false))
      .toEqual({ ok: false, reason: 'no_whatsapp_opt_in' })
    expect(checkEligibility('whatsapp', 'marketing', makeContact({ phone, whatsapp_consent: 'opted_in' }), false).ok).toBe(true)
  })
  it('allows utility messages without opt-in but never to opted-out or suppressed contacts', () => {
    expect(checkEligibility('whatsapp', 'utility', makeContact({ phone }), false).ok).toBe(true)
    expect(checkEligibility('whatsapp', 'utility', makeContact({ phone, whatsapp_consent: 'opted_out' }), false))
      .toEqual({ ok: false, reason: 'opted_out' })
    expect(checkEligibility('email', 'utility', makeContact({ email, email_consent: 'opted_in' }), true))
      .toEqual({ ok: false, reason: 'suppressed' })
  })
  it('rejects missing/invalid addresses', () => {
    expect(checkEligibility('email', 'utility', makeContact({ email: 'bad' }), false)).toEqual({ ok: false, reason: 'invalid_email' })
    expect(checkEligibility('whatsapp', 'utility', makeContact({ phone: null }), false)).toEqual({ ok: false, reason: 'invalid_phone' })
  })
})

describe('WhatsApp 24h service window', () => {
  const now = new Date('2026-10-22T12:00:00Z')
  it('open within 24h of last inbound', () => expect(isWithinServiceWindow('2026-10-21T13:00:00Z', now)).toBe(true))
  it('closed after 24h', () => expect(isWithinServiceWindow('2026-10-21T11:59:00Z', now)).toBe(false))
  it('closed if never messaged', () => expect(isWithinServiceWindow(null, now)).toBe(false))
})

describe('send window (Dubai 09:00–18:00)', () => {
  it('allows 10:00 Dubai (06:00 UTC)', () => expect(isWithinSendWindow(new Date('2026-10-22T06:00:00Z'))).toBe(true))
  it('blocks 08:59 Dubai', () => expect(isWithinSendWindow(new Date('2026-10-22T04:59:00Z'))).toBe(false))
  it('blocks 18:00 Dubai', () => expect(isWithinSendWindow(new Date('2026-10-22T14:00:00Z'))).toBe(false))
  it('blocks 02:00 Dubai', () => expect(isWithinSendWindow(new Date('2026-10-21T22:00:00Z'))).toBe(false))
})

describe('email warm-up caps', () => {
  const now = new Date('2026-10-22T12:00:00Z')
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()
  it('starts at 50/day for a brand-new domain', () => expect(emailDailyCap(null, now, 2000)).toBe(50))
  it('ramps up over 4 weeks', () => {
    expect(emailDailyCap(daysAgo(0), now, 2000)).toBe(50)
    expect(emailDailyCap(daysAgo(5), now, 2000)).toBe(100)
    expect(emailDailyCap(daysAgo(10), now, 2000)).toBe(250)
    expect(emailDailyCap(daysAgo(18), now, 2000)).toBe(500)
    expect(emailDailyCap(daysAgo(25), now, 2000)).toBe(1000)
    expect(emailDailyCap(daysAgo(40), now, 2000)).toBe(2000)
  })
  it('never exceeds configured max', () => expect(emailDailyCap(daysAgo(40), now, 300)).toBe(300))
  it('remaining capacity floors at zero', () => {
    expect(remainingCapacity(100, 30)).toBe(70)
    expect(remainingCapacity(100, 130)).toBe(0)
  })
})

describe('healthBreaker', () => {
  it('ignores small samples', () => expect(healthBreaker('email', { attempted: 10, bounced: 5, complained: 1, failed: 0 })).toBeNull())
  it('pauses email over 0.1% complaints', () =>
    expect(healthBreaker('email', { attempted: 1000, bounced: 0, complained: 2, failed: 0 })).toMatch(/complaint/i))
  it('pauses email over 2% bounces', () =>
    expect(healthBreaker('email', { attempted: 100, bounced: 3, complained: 0, failed: 0 })).toMatch(/bounce/i))
  it('passes healthy email', () => expect(healthBreaker('email', { attempted: 1000, bounced: 10, complained: 1, failed: 0 })).toBeNull())
  it('pauses WhatsApp over 10% failures', () =>
    expect(healthBreaker('whatsapp', { attempted: 100, bounced: 0, complained: 0, failed: 11 })).toMatch(/failure/i))
})

describe('opt-out / opt-in keywords', () => {
  it.each(['STOP', 'stop', ' Stop! ', 'Unsubscribe', 'opt out', 'توقف', 'إلغاء الاشتراك', 'الغاء'])('"%s" is opt-out', t =>
    expect(isOptOutMessage(t)).toBe(true))
  it.each(['Can you stop by tomorrow?', 'I want to cancel my viewing on Friday', 'hello', ''])('"%s" is not opt-out', t =>
    expect(isOptOutMessage(t)).toBe(false))
  it('START re-subscribes, casual yes does not', () => {
    expect(isOptInMessage('START')).toBe(true)
    expect(isOptInMessage('اشتراك')).toBe(true)
    expect(isOptInMessage('yes')).toBe(false)
  })
})

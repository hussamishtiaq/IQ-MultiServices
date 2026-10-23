import { describe, expect, it } from 'vitest'
import {
  dubaiSlot, dueForReminder, isValidSlot, listingSummary, matchesSearch, parseRef, pickAgent, propertyRef,
  refToIdPrefix, viewingSlots, whatsappInquiryText, whatsappLink,
} from '../core'
import type { Property } from '@/types'

const prop: Property = {
  id: '3f9a2c11-2222-3333-4444-555566667777', title: 'Marina 2BR', slug: 'marina-2br', description: null,
  price: 1_850_000, currency: 'AED', location: 'Dubai Marina', area_id: 'a1', project_id: null, type: 'apartment',
  listing_type: 'sale', completion_status: 'ready', furnishing: null, studio_type: null, rent_period: null,
  payment_plan: null, handover_date: null, bedrooms: 2, bathrooms: 2, area: 110, status: 'available', images: [],
  featured: false, views_count: 0, permit_number: null, agent_name: null, agent_brn: null, created_at: '',
}

describe('property refs', () => {
  it('builds and parses refs round-trip', () => {
    expect(propertyRef(prop.id)).toBe('IQ-3F9A2C')
    expect(parseRef("Hi, I'm interested in \"Marina 2BR\".\nRef: IQ-3f9a2c\nhttps://x")).toBe('IQ-3F9A2C')
    expect(refToIdPrefix('IQ-3F9A2C')).toBe('3f9a2c')
    expect(parseRef('no reference here')).toBeNull()
    expect(parseRef('IQ-12345')).toBeNull()
  })
})

describe('whatsapp click-to-chat', () => {
  it('prefills title, price, ref and link', () => {
    const t = whatsappInquiryText(prop, 'https://iq.ae/')
    expect(t).toBe('Hi, I\'m interested in "Marina 2BR" listed at AED 1,850,000.\nRef: IQ-3F9A2C\nhttps://iq.ae/properties/marina-2br')
    expect(whatsappInquiryText({ ...prop, listing_type: 'rent', price: 120000 }, 'https://iq.ae', 'visit')).toMatch(/^Hi, I'd like to schedule a viewing of .*\(rent\)/)
  })
  it('encodes the link and strips non-digits from the number', () => {
    const l = whatsappLink('+971 50 123 4567', 'a b&c')
    expect(l).toBe('https://wa.me/971501234567?text=a%20b%26c')
  })
  it('listing summary uses real data and flags unavailable listings', () => {
    expect(listingSummary(prop, 'https://iq.ae')).toContain('Price: AED 1,850,000')
    expect(listingSummary({ ...prop, status: 'sold' }, 'https://iq.ae')).toContain('Status: sold')
    expect(listingSummary({ ...prop, bedrooms: 0 }, 'https://iq.ae')).toContain('Studio')
  })
})

describe('pickAgent', () => {
  const a = (id: string, last: string | null, active = true) => ({ id, active, last_assigned_at: last, created_at: `2026-01-0${id}` })
  it('prefers never-assigned, then least recently assigned, skipping inactive', () => {
    expect(pickAgent([a('1', '2026-10-01'), a('2', null), a('3', '2026-09-01')])!.id).toBe('2')
    expect(pickAgent([a('1', '2026-10-01'), a('2', '2026-09-01', false), a('3', '2026-09-15')])!.id).toBe('3')
    expect(pickAgent([a('1', null, false)])).toBeNull()
  })
  it('rotates fairly over repeated assignments', () => {
    const agents = [a('1', null), a('2', null), a('3', null)]
    const order: string[] = []
    for (let i = 0; i < 6; i++) {
      const p = pickAgent(agents)!
      order.push(p.id)
      p.last_assigned_at = `2026-10-23T10:0${i}:00Z`
    }
    expect(order).toEqual(['1', '2', '3', '1', '2', '3'])
  })
})

describe('viewing slots (Dubai time)', () => {
  const now = new Date('2026-10-23T05:00:00Z') // 09:00 Dubai
  it('maps Dubai hours to UTC', () => expect(dubaiSlot('2026-10-24', 10).toISOString()).toBe('2026-10-24T06:00:00.000Z'))
  it('respects minimum lead time and opening hours', () => {
    const s = viewingSlots(now, [])
    expect(s[0]).toMatchObject({ date: '2026-10-23', hour: 12 }) // 09:00 + 3h lead
    expect(s.every(x => x.hour >= 10 && x.hour < 18)).toBe(true)
    expect(new Set(s.map(x => x.date)).size).toBe(15)
  })
  it('marks booked slots unavailable', () => {
    const booked = dubaiSlot('2026-10-24', 11).toISOString()
    expect(viewingSlots(now, [booked]).find(x => x.iso === booked)!.available).toBe(false)
  })
  it('validates requested slots', () => {
    expect(isValidSlot(dubaiSlot('2026-10-24', 11).toISOString(), now)).toBe(true)
    expect(isValidSlot(dubaiSlot('2026-10-24', 20).toISOString(), now)).toBe(false)  // after hours
    expect(isValidSlot('2026-10-23T05:30:00Z', now)).toBe(false)                      // too soon / not on grid
    expect(isValidSlot(dubaiSlot('2026-12-30', 11).toISOString(), now)).toBe(false)   // too far ahead
    expect(isValidSlot('garbage', now)).toBe(false)
  })
  it('reminds once, ~a day before, only for confirmed viewings', () => {
    const at = '2026-10-24T06:00:00Z'
    expect(dueForReminder({ scheduled_at: at, status: 'confirmed', reminder_sent_at: null }, now)).toBe(true)
    expect(dueForReminder({ scheduled_at: at, status: 'requested', reminder_sent_at: null }, now)).toBe(false)
    expect(dueForReminder({ scheduled_at: at, status: 'confirmed', reminder_sent_at: 'x' }, now)).toBe(false)
    expect(dueForReminder({ scheduled_at: '2026-10-27T06:00:00Z', status: 'confirmed', reminder_sent_at: null }, now)).toBe(false)
  })
})

describe('matchesSearch', () => {
  it('applies every criterion', () => {
    expect(matchesSearch(prop, { listing_type: 'sale', area_id: 'a1', type: 'apartment', min_beds: 2, max_price_aed: 2_000_000 })).toBe(true)
    expect(matchesSearch(prop, { listing_type: 'rent' })).toBe(false)
    expect(matchesSearch(prop, { area_id: 'other' })).toBe(false)
    expect(matchesSearch(prop, { min_beds: 3 })).toBe(false)
    expect(matchesSearch(prop, { max_price_aed: 1_000_000 })).toBe(false)
    expect(matchesSearch({ ...prop, status: 'sold' }, {})).toBe(false)
    expect(matchesSearch({ ...prop, price: 500_000, currency: 'USD' }, { max_price_aed: 1_800_000 })).toBe(false)
  })
})

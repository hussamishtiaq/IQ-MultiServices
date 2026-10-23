import { formatPrice } from '@/lib/format'
import { toAed } from '@/lib/purchase-costs'
import type { Property } from '@/types'

// ── Property reference codes ────────────────────────────────────────────────

/** Short, human-friendly listing reference, e.g. "IQ-3F9A2C" (first 6 hex chars of the UUID). */
export function propertyRef(id: string): string {
  return `IQ-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

/** Extracts a listing reference from free text such as a prefilled WhatsApp message. */
export function parseRef(text: string | null | undefined): string | null {
  const m = (text ?? '').match(/\bIQ-([0-9A-F]{6})\b/i)
  return m ? `IQ-${m[1].toUpperCase()}` : null
}

/** UUID prefix for a ref, used to look the property up ("IQ-3F9A2C" → "3f9a2c"). */
export function refToIdPrefix(ref: string): string {
  return ref.slice(3).toLowerCase()
}

// ── WhatsApp click-to-chat ──────────────────────────────────────────────────

export function propertyUrl(siteUrl: string, p: Pick<Property, 'id' | 'slug'>): string {
  return `${siteUrl.replace(/\/$/, '')}/properties/${p.slug ?? p.id}`
}

export function whatsappInquiryText(p: Pick<Property, 'id' | 'slug' | 'title' | 'price' | 'currency' | 'listing_type'>, siteUrl: string, intent: 'ask' | 'visit' = 'ask'): string {
  const price = p.price != null ? ` listed at ${formatPrice(p.price, p.currency)}${p.listing_type === 'rent' ? ' (rent)' : ''}` : ''
  const opener = intent === 'visit' ? "Hi, I'd like to schedule a viewing of" : "Hi, I'm interested in"
  return `${opener} "${p.title}"${price}.\nRef: ${propertyRef(p.id)}\n${propertyUrl(siteUrl, p)}`
}

export function whatsappLink(businessNumber: string, text: string): string {
  return `https://wa.me/${businessNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

/** Verified listing summary sent back when an inbound WhatsApp message carries a ref. */
export function listingSummary(p: Property, siteUrl: string): string {
  const lines = [
    `Thanks for your interest in *${p.title}* (${propertyRef(p.id)}).`,
    p.price != null ? `Price: ${formatPrice(p.price, p.currency)}${p.listing_type === 'rent' ? ` / ${p.rent_period ?? 'year'}` : ''}` : null,
    p.location ? `Location: ${p.location}` : null,
    [p.bedrooms === 0 ? 'Studio' : p.bedrooms != null ? `${p.bedrooms} bed` : null, p.bathrooms != null ? `${p.bathrooms} bath` : null, p.area != null ? `${p.area} m²` : null].filter(Boolean).join(' · ') || null,
    p.status !== 'available' ? `Status: ${p.status} — we can suggest similar options.` : 'Status: available',
    propertyUrl(siteUrl, p),
    'An agent will reply shortly. Reply VISIT to request a viewing.',
  ]
  return lines.filter(Boolean).join('\n')
}

// ── Agent assignment (round-robin) ──────────────────────────────────────────

export interface AgentLite { id: string; active: boolean; last_assigned_at: string | null; created_at: string }

/** Picks the active agent who was assigned least recently (never-assigned first, then oldest). */
export function pickAgent<T extends AgentLite>(agents: T[]): T | null {
  const active = agents.filter(a => a.active)
  if (!active.length) return null
  return [...active].sort((a, b) => {
    if (!a.last_assigned_at && b.last_assigned_at) return -1
    if (a.last_assigned_at && !b.last_assigned_at) return 1
    const byAssigned = (a.last_assigned_at ?? '').localeCompare(b.last_assigned_at ?? '')
    return byAssigned !== 0 ? byAssigned : a.created_at.localeCompare(b.created_at)
  })[0]
}

// ── Viewing slots ───────────────────────────────────────────────────────────

export const VIEWING_CONFIG = {
  timeZone: 'Asia/Dubai',
  utcOffsetHours: 4,          // Dubai has no DST
  firstHour: 10,
  lastHour: 18,               // last slot starts 17:00
  slotMinutes: 60,
  daysAhead: 14,
  minLeadHours: 3,            // no bookings starting sooner than this
  closedWeekdays: [] as number[], // 0 = Sunday … 6 = Saturday
}

/** Dubai-local Y-M-D for an instant. */
export function dubaiDate(d: Date): string {
  return new Date(d.getTime() + VIEWING_CONFIG.utcOffsetHours * 3_600_000).toISOString().slice(0, 10)
}

/** UTC instant for a Dubai-local date (YYYY-MM-DD) and hour. */
export function dubaiSlot(date: string, hour: number): Date {
  return new Date(`${date}T${String(hour - VIEWING_CONFIG.utcOffsetHours).padStart(2, '0')}:00:00.000Z`)
}

export interface Slot { iso: string; date: string; hour: number; available: boolean }

/** All bookable slots in the window, with already-booked ones marked unavailable. */
export function viewingSlots(now: Date, bookedIso: string[], cfg = VIEWING_CONFIG): Slot[] {
  const booked = new Set(bookedIso.map(s => new Date(s).toISOString()))
  const earliest = now.getTime() + cfg.minLeadHours * 3_600_000
  const slots: Slot[] = []
  for (let d = 0; d <= cfg.daysAhead; d++) {
    const date = dubaiDate(new Date(now.getTime() + d * 86_400_000))
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    if (cfg.closedWeekdays.includes(weekday)) continue
    for (let h = cfg.firstHour; h < cfg.lastHour; h += cfg.slotMinutes / 60) {
      const at = dubaiSlot(date, h)
      if (at.getTime() < earliest) continue
      const iso = at.toISOString()
      slots.push({ iso, date, hour: h, available: !booked.has(iso) })
    }
  }
  return slots
}

export function isValidSlot(iso: string, now: Date, cfg = VIEWING_CONFIG): boolean {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return false
  return viewingSlots(now, [], cfg).some(s => s.iso === t.toISOString())
}

export function formatDubaiTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: VIEWING_CONFIG.timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Viewings starting 20–28h from now that haven't had a reminder (cron runs every ~10 min). */
export function dueForReminder(v: { scheduled_at: string; status: string; reminder_sent_at: string | null }, now: Date): boolean {
  if (v.status !== 'confirmed' || v.reminder_sent_at) return false
  const hours = (new Date(v.scheduled_at).getTime() - now.getTime()) / 3_600_000
  return hours > 2 && hours <= 26
}

// ── Saved-search matching ───────────────────────────────────────────────────

export interface SearchCriteria {
  listing_type?: 'sale' | 'rent'
  area_id?: string
  type?: Property['type']
  min_beds?: number
  max_price_aed?: number
}

export function matchesSearch(p: Pick<Property, 'listing_type' | 'area_id' | 'type' | 'bedrooms' | 'price' | 'currency' | 'status'>, c: SearchCriteria): boolean {
  if (p.status !== 'available') return false
  if (c.listing_type && p.listing_type !== c.listing_type) return false
  if (c.area_id && p.area_id !== c.area_id) return false
  if (c.type && p.type !== c.type) return false
  if (c.min_beds != null && (p.bedrooms ?? -1) < c.min_beds) return false
  if (c.max_price_aed != null && (p.price == null || toAed(p.price, p.currency) > c.max_price_aed)) return false
  return true
}

export function describeSearch(c: SearchCriteria, areaName?: string | null): string {
  const parts = [
    c.min_beds != null ? (c.min_beds === 0 ? 'Studio+' : `${c.min_beds}+ bed`) : null,
    c.type ?? 'property',
    c.listing_type ? `for ${c.listing_type}` : null,
    areaName ? `in ${areaName}` : null,
    c.max_price_aed ? `up to AED ${c.max_price_aed.toLocaleString('en-US')}` : null,
  ]
  return parts.filter(Boolean).join(' ')
}

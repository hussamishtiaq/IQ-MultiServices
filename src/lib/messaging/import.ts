import { normalizeEmail, normalizePhone } from './compliance'
import type { MessagingStore } from './store'
import type { AudienceContact } from './types'

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const s = input.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(f => f.trim() !== '')) rows.push(row)
  return rows
}

/**
 * How the admin says these contacts relate to the business. This is recorded
 * on every contact as the legal basis for messaging them.
 *  - none:                  no consent → can only receive 1:1 utility messages
 *  - existing_relationship: past clients/partners → marketing email allowed ("implied"), WhatsApp NOT
 *  - documented_opt_in:     admin holds records of opt-in → email + WhatsApp marketing allowed
 */
export type ConsentBasis = 'none' | 'existing_relationship' | 'documented_opt_in'

export interface ImportRow {
  name: string | null; email: string | null; phone: string | null
  company: string | null; tags: string[]; contact_type: AudienceContact['contact_type']
}

export interface ImportPreview { rows: ImportRow[]; invalid: Array<{ line: number; reason: string }> }

const TYPES = new Set(['client', 'b2b', 'lead', 'other'])

export function prepareImport(csv: string, defaultCountryCode = '971'): ImportPreview {
  const table = parseCsv(csv)
  if (!table.length) return { rows: [], invalid: [] }
  const header = table[0].map(h => h.trim().toLowerCase())
  const col = (names: string[]) => header.findIndex(h => names.includes(h))
  const idx = {
    name: col(['name', 'full name', 'full_name']),
    email: col(['email', 'e-mail', 'email address']),
    phone: col(['phone', 'mobile', 'whatsapp', 'phone number']),
    company: col(['company', 'business', 'organization']),
    tags: col(['tags', 'tag']),
    type: col(['type', 'contact_type']),
  }
  if (idx.email < 0 && idx.phone < 0) {
    return { rows: [], invalid: [{ line: 1, reason: 'CSV needs an "email" or "phone" column' }] }
  }

  const out: ImportRow[] = []
  const invalid: ImportPreview['invalid'] = []
  const seen = new Set<string>()

  table.slice(1).forEach((r, i) => {
    const line = i + 2
    const get = (k: number) => (k >= 0 ? (r[k] ?? '').trim() : '')
    const email = normalizeEmail(get(idx.email))
    const phone = normalizePhone(get(idx.phone), defaultCountryCode)
    if (!email && !phone) { invalid.push({ line, reason: 'no valid email or phone' }); return }
    const key = email ?? phone!
    if (seen.has(key)) { invalid.push({ line, reason: 'duplicate in file' }); return }
    seen.add(key)
    const t = get(idx.type).toLowerCase()
    out.push({
      name: get(idx.name) || null, email, phone, company: get(idx.company) || null,
      tags: get(idx.tags).split(/[;|]/).map(x => x.trim().toLowerCase()).filter(Boolean),
      contact_type: (TYPES.has(t) ? t : 'client') as ImportRow['contact_type'],
    })
  })
  return { rows: out, invalid }
}

export function consentFor(basis: ConsentBasis, note: string, now: Date): Partial<AudienceContact> {
  const at = now.toISOString()
  const source = `import:${basis}${note ? ` — ${note.slice(0, 200)}` : ''}`
  if (basis === 'documented_opt_in') {
    return { email_consent: 'opted_in', email_consent_at: at, email_consent_source: source, whatsapp_consent: 'opted_in', whatsapp_consent_at: at, whatsapp_consent_source: source }
  }
  if (basis === 'existing_relationship') {
    return { email_consent: 'implied', email_consent_at: at, email_consent_source: source }
  }
  return {}
}

export interface ImportResult { created: number; updated: number; invalid: ImportPreview['invalid'] }

export async function importContacts(store: MessagingStore, csv: string, basis: ConsentBasis, note: string, extraTags: string[] = [], now = new Date()): Promise<ImportResult> {
  const { rows, invalid } = prepareImport(csv)
  const consent = consentFor(basis, note, now)
  let created = 0, updated = 0

  for (const r of rows) {
    const existing = (r.email && await store.findContactByAddress('email', r.email)) || (r.phone && await store.findContactByAddress('whatsapp', r.phone)) || null
    const tags = Array.from(new Set([...r.tags, ...extraTags.map(t => t.toLowerCase())]))
    if (existing) {
      const patch: Partial<AudienceContact> = {
        name: existing.name ?? r.name, company: existing.company ?? r.company,
        email: existing.email ?? r.email, phone: existing.phone ?? r.phone,
        tags: Array.from(new Set([...existing.tags, ...tags])),
      }
      // Import can upgrade 'unknown' consent but never overrides an opt-out or an existing opt-in.
      if (existing.email_consent === 'unknown' && consent.email_consent) Object.assign(patch, { email_consent: consent.email_consent, email_consent_at: consent.email_consent_at, email_consent_source: consent.email_consent_source })
      if (existing.whatsapp_consent === 'unknown' && consent.whatsapp_consent) Object.assign(patch, { whatsapp_consent: consent.whatsapp_consent, whatsapp_consent_at: consent.whatsapp_consent_at, whatsapp_consent_source: consent.whatsapp_consent_source })
      await store.updateContact(existing.id, patch)
      updated++
    } else {
      await store.createContact({ ...r, tags, source: 'import', ...consent })
      created++
    }
  }
  return { created, updated, invalid }
}

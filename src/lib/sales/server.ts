import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { checkEligibility, isWithinSendWindow, normalizeEmail, normalizePhone } from '@/lib/messaging/compliance'
import type { MessagingConfig } from '@/lib/messaging/config'
import { sendSingleEmail, sendWhatsAppTemplate, sendWhatsAppText, type SendResult } from '@/lib/messaging/providers'
import { escapeHtml, listUnsubscribeHeaders, oneClickUnsubscribeUrl, unsubscribeUrl } from '@/lib/messaging/render'
import { SupabaseMessagingStore } from '@/lib/messaging/store'
import type { AudienceContact, Channel } from '@/lib/messaging/types'
import type { Lead, Property } from '@/types'
import {
  describeSearch, dueForReminder, formatDubaiTime, isValidSlot, listingSummary, matchesSearch, parseRef, pickAgent,
  propertyRef, propertyUrl, refToIdPrefix, type SearchCriteria,
} from './core'

export interface Agent {
  id: string; name: string; email: string | null; phone: string | null; brn: string | null
  active: boolean; last_assigned_at: string | null; created_at: string
}

export interface Viewing {
  id: string; property_id: string | null; lead_id: string | null; agent_id: string | null; contact_id: string | null
  name: string; phone: string; email: string | null; scheduled_at: string
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null; confirmation_sent_at: string | null; reminder_sent_at: string | null; created_at: string
}

const env = () => ({
  ackTemplate: process.env.WHATSAPP_ACK_TEMPLATE || '',
  viewingTemplate: process.env.WHATSAPP_VIEWING_TEMPLATE || '',
  alertTemplate: process.env.WHATSAPP_ALERT_TEMPLATE || '',
  templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
})

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ── Contacts & message log ──────────────────────────────────────────────────

export async function ensureContact(db: SupabaseClient, input: { name?: string | null; email?: string | null; phone?: string | null; countryCode?: string | null }): Promise<AudienceContact | null> {
  const store = new SupabaseMessagingStore(db)
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone, (input.countryCode ?? '').replace(/\D/g, '') || '971')
  if (!email && !phone) return null
  const existing = (email && await store.findContactByAddress('email', email)) || (phone && await store.findContactByAddress('whatsapp', phone)) || null
  if (existing) {
    const patch: Partial<AudienceContact> = {}
    if (!existing.email && email) patch.email = email
    if (!existing.phone && phone) patch.phone = phone
    if (!existing.name && input.name) patch.name = input.name
    if (Object.keys(patch).length) await store.updateContact(existing.id, patch)
    return { ...existing, ...patch }
  }
  return store.createContact({ name: input.name ?? null, email, phone, source: 'lead_form', contact_type: 'lead' })
}

/** Sends a 1:1 utility message (ack, confirmation, reminder) if the contact hasn't opted out, and logs it. */
async function sendUtility(db: SupabaseClient, cfg: MessagingConfig, contact: AudienceContact, channel: Channel, msg: {
  subject?: string; text: string; html?: string; template?: { name: string; params: string[] }
}): Promise<SendResult | null> {
  const store = new SupabaseMessagingStore(db)
  const address = channel === 'email' ? normalizeEmail(contact.email) : normalizePhone(contact.phone)
  if (!address) return null
  const suppressed = (await store.suppressedSet(channel, [address])).has(address)
  if (!checkEligibility(channel, 'utility', contact, suppressed).ok) return null

  let r: SendResult
  if (channel === 'email') {
    r = await sendSingleEmail(cfg, { to: address, subject: msg.subject ?? 'IQ MultiServices', text: msg.text, html: msg.html ?? `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${escapeHtml(msg.text).replace(/\n/g, '<br/>')}</div>` })
  } else if (msg.template) {
    r = await sendWhatsAppTemplate(cfg, address, msg.template.name, env().templateLang, msg.template.params)
  } else {
    r = await sendWhatsAppText(cfg, address, msg.text)
  }
  await store.insertMessages([{
    contact_id: contact.id, channel, direction: 'outbound', category: 'utility', to_address: address,
    subject: msg.subject ?? null, body: msg.text, template_name: msg.template?.name ?? null,
    status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error ?? null,
    provider_message_id: r.providerId ?? null, sent_at: r.ok ? new Date().toISOString() : null,
  }])
  return r
}

// ── Agent assignment ────────────────────────────────────────────────────────

export async function assignAgent(db: SupabaseClient, leadId: string, preferAgentId?: string | null): Promise<Agent | null> {
  const agents = must(await db.from('agents').select('*').eq('active', true)) as Agent[]
  const agent = (preferAgentId && agents.find(a => a.id === preferAgentId)) || pickAgent(agents)
  if (!agent) return null
  const now = new Date().toISOString()
  must(await db.from('leads').update({ assigned_agent_id: agent.id }).eq('id', leadId))
  must(await db.from('agents').update({ last_assigned_at: now }).eq('id', agent.id))
  return agent
}

async function notifyAgent(agent: Agent, lead: Pick<Lead, 'id' | 'name' | 'phone' | 'country_code' | 'email' | 'message' | 'source'>, property: Property | null, siteUrl: string, extra?: string) {
  if (!agent.email) return
  const title = property ? `${property.title} (${propertyRef(property.id)})` : 'general inquiry'
  await sendEmail({
    to: agent.email,
    subject: `New lead assigned: ${lead.name} — ${title}`,
    text: `You've been assigned a new lead.\n\nName: ${lead.name}\nPhone: ${lead.country_code ?? ''} ${lead.phone}${lead.email ? `\nEmail: ${lead.email}` : ''}\nSource: ${lead.source ?? 'website'}\nProperty: ${title}${extra ? `\n${extra}` : ''}${lead.message ? `\n\nMessage: ${lead.message}` : ''}\n\nOpen: ${siteUrl}/admin/leads`,
    html: `<p>You've been assigned a new lead.</p><p><b>${escapeHtml(lead.name)}</b><br/>${escapeHtml(`${lead.country_code ?? ''} ${lead.phone}`)}${lead.email ? `<br/>${escapeHtml(lead.email)}` : ''}</p><p>Property: ${escapeHtml(title)}${extra ? `<br/>${escapeHtml(extra)}` : ''}</p>${lead.message ? `<p><i>${escapeHtml(lead.message)}</i></p>` : ''}<p><a href="${siteUrl}/admin/leads">Open leads</a></p>`,
  })
}

// ── New lead pipeline: follow-up date, agent, acknowledgment ────────────────

export async function processNewLead(db: SupabaseClient, cfg: MessagingConfig, leadId: string, opts: { acknowledge?: boolean; preferAgentId?: string | null; extra?: string } = {}) {
  const lead = must(await db.from('leads').select('*').eq('id', leadId).single()) as Lead & { contact_id: string | null }
  const property = lead.property_id ? must(await db.from('properties').select('*').eq('id', lead.property_id).maybeSingle()) as Property | null : null

  const contact = await ensureContact(db, { name: lead.name, email: lead.email, phone: lead.phone, countryCode: lead.country_code })
  const followUp = new Date(Date.now() + 24 * 3_600_000).toISOString()
  must(await db.from('leads').update({ next_follow_up_at: followUp, contact_id: contact?.id ?? null }).eq('id', leadId))

  const agent = await assignAgent(db, leadId, opts.preferAgentId)
  if (agent) await notifyAgent(agent, lead, property, cfg.siteUrl, opts.extra).catch(e => console.error('[sales] agent notify failed', e))

  if (opts.acknowledge === false || !contact) return { agent, contact }

  const first = lead.name.split(/\s+/)[0]
  const about = property ? `"${property.title}" (${propertyRef(property.id)})` : 'your inquiry'
  const who = agent ? `${agent.name}${agent.brn ? ` (BRN ${agent.brn})` : ''}` : 'one of our agents'
  const text = `Hi ${first}, thanks for contacting IQ MultiServices about ${about}. ${who} will get back to you shortly${lead.preferred_contact ? ` via ${lead.preferred_contact}` : ''}.${property ? `\n${propertyUrl(cfg.siteUrl, property)}` : ''}`

  if (contact.email) await sendUtility(db, cfg, contact, 'email', { subject: `We received your inquiry${property ? ` — ${property.title}` : ''}`, text })
  const t = env()
  if (contact.phone && t.ackTemplate) {
    await sendUtility(db, cfg, contact, 'whatsapp', { text, template: { name: t.ackTemplate, params: [first, property ? property.title : 'your inquiry', agent?.name ?? 'our team'] } })
  }
  return { agent, contact }
}

// ── Inbound WhatsApp: ref → lead + verified listing reply ───────────────────

export async function findPropertyByRef(db: SupabaseClient, ref: string): Promise<Property | null> {
  const p = refToIdPrefix(ref)
  if (!/^[0-9a-f]{6}$/.test(p)) return null
  const rows = must(await db.from('properties').select('*')
    .gte('id', `${p}00-0000-0000-0000-000000000000`).lte('id', `${p}ff-ffff-ffff-ffff-ffffffffffff`).limit(2)) as Property[]
  return rows.length === 1 ? rows[0] : null
}

export async function handleInboundWhatsApp(db: SupabaseClient, cfg: MessagingConfig, contact: AudienceContact, body: string | null): Promise<void> {
  const text = (body ?? '').trim()
  if (/^visit$/i.test(text) || /^زيارة$/.test(text)) {
    const { data: last } = await db.from('leads').select('property_id').eq('contact_id', contact.id).not('property_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1)
    const pid = last?.[0]?.property_id as string | undefined
    const prop = pid ? must(await db.from('properties').select('id, slug').eq('id', pid).maybeSingle()) as Pick<Property, 'id' | 'slug'> | null : null
    const link = prop ? `${propertyUrl(cfg.siteUrl, prop)}?book=1#book` : `${cfg.siteUrl}/properties`
    await sendUtility(db, cfg, contact, 'whatsapp', { text: `Pick a viewing time that suits you here: ${link}\nAn agent will confirm it.` })
    return
  }

  const ref = parseRef(text)
  if (!ref) return
  const property = await findPropertyByRef(db, ref)
  if (!property) return

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: existing } = await db.from('leads').select('id').eq('contact_id', contact.id).eq('property_id', property.id).gte('created_at', since).limit(1)
  // Repeat messages about the same listing go to the assigned agent; don't resend the summary.
  if (existing?.length) return
  {
    const lead = must(await db.from('leads').insert({
      property_id: property.id, area_id: property.area_id, source: 'whatsapp',
      name: contact.name ?? `WhatsApp +${contact.phone}`, phone: `+${contact.phone}`, country_code: null,
      email: contact.email, message: text.slice(0, 2000), preferred_contact: 'whatsapp', contact_id: contact.id,
    }).select('id').single()) as { id: string }
    await processNewLead(db, cfg, lead.id, { acknowledge: false })
  }
  // Customer just wrote to us, so the 24h window is open: free-form reply with verified listing data.
  await sendUtility(db, cfg, contact, 'whatsapp', { text: listingSummary(property, cfg.siteUrl) })
}

// ── Viewings ────────────────────────────────────────────────────────────────

export async function bookedSlots(db: SupabaseClient, propertyId: string): Promise<string[]> {
  const rows = must(await db.from('viewings').select('scheduled_at').eq('property_id', propertyId)
    .in('status', ['requested', 'confirmed']).gte('scheduled_at', new Date().toISOString())) as Array<{ scheduled_at: string }>
  return rows.map(r => new Date(r.scheduled_at).toISOString())
}

export async function bookViewing(db: SupabaseClient, cfg: MessagingConfig, input: {
  propertyId: string; scheduledAt: string; name: string; phone: string; email?: string | null; countryCode?: string | null; notes?: string | null
}, now = new Date()): Promise<{ viewing: Viewing; agent: Agent | null }> {
  if (!isValidSlot(input.scheduledAt, now)) throw new Error('That time slot is not available. Please choose another.')
  const at = new Date(input.scheduledAt).toISOString()
  const property = must(await db.from('properties').select('*').eq('id', input.propertyId).maybeSingle()) as Property | null
  if (!property) throw new Error('Property not found')
  if (property.status !== 'available') throw new Error('This property is no longer available for viewings.')
  if ((await bookedSlots(db, property.id)).includes(at)) throw new Error('Someone just booked that slot. Please choose another.')

  // Prefer an agent who is free at that time.
  const agents = must(await db.from('agents').select('*').eq('active', true)) as Agent[]
  const busy = new Set((must(await db.from('viewings').select('agent_id').eq('scheduled_at', at).in('status', ['requested', 'confirmed'])) as Array<{ agent_id: string | null }>).map(r => r.agent_id))
  const agent = pickAgent(agents.filter(a => !busy.has(a.id)))

  const lead = must(await db.from('leads').insert({
    property_id: property.id, area_id: property.area_id, source: 'viewing_request', name: input.name,
    phone: input.phone, country_code: input.countryCode ?? '+971', email: input.email ?? null,
    message: `Viewing requested for ${formatDubaiTime(at)}${input.notes ? ` — ${input.notes}` : ''}`, preferred_contact: 'whatsapp',
  }).select('id').single()) as { id: string }

  const res = await db.from('viewings').insert({
    property_id: property.id, lead_id: lead.id, agent_id: agent?.id ?? null, name: input.name, phone: input.phone,
    email: input.email ?? null, scheduled_at: at, notes: input.notes ?? null,
  }).select().single()
  if (res.error) {
    if (/duplicate|unique/i.test(res.error.message)) throw new Error('Someone just booked that slot. Please choose another.')
    throw new Error(res.error.message)
  }
  const viewing = res.data as Viewing
  const { contact } = await processNewLead(db, cfg, lead.id, { acknowledge: false, preferAgentId: agent?.id, extra: `Viewing requested: ${formatDubaiTime(at)}` })
  if (contact) {
    must(await db.from('viewings').update({ contact_id: contact.id }).eq('id', viewing.id))
    const text = `Hi ${input.name.split(/\s+/)[0]}, we received your viewing request for "${property.title}" on ${formatDubaiTime(at)} (Dubai time). ${agent ? agent.name : 'An agent'} will confirm shortly.`
    if (contact.email) await sendUtility(db, cfg, contact, 'email', { subject: `Viewing request received — ${property.title}`, text })
  }
  return { viewing, agent }
}

async function notifyViewing(db: SupabaseClient, cfg: MessagingConfig, v: Viewing, kind: 'confirmed' | 'reminder' | 'cancelled') {
  const contact = v.contact_id ? must(await db.from('audience_contacts').select('*').eq('id', v.contact_id).maybeSingle()) as AudienceContact | null : null
  if (!contact) return
  const property = v.property_id ? must(await db.from('properties').select('id, slug, title, location').eq('id', v.property_id).maybeSingle()) as Property | null : null
  const agent = v.agent_id ? must(await db.from('agents').select('*').eq('id', v.agent_id).maybeSingle()) as Agent | null : null
  const when = formatDubaiTime(v.scheduled_at)
  const what = property?.title ?? 'the property'
  const text = kind === 'confirmed'
    ? `Your viewing of "${what}" is confirmed for ${when} (Dubai time).${agent ? ` Your agent: ${agent.name}${agent.phone ? `, +${agent.phone}` : ''}.` : ''}${property?.location ? `\nLocation: ${property.location}` : ''}`
    : kind === 'reminder'
      ? `Reminder: your viewing of "${what}" is tomorrow, ${when} (Dubai time).${agent ? ` ${agent.name} will meet you.` : ''} Reply to reschedule.`
      : `Your viewing of "${what}" on ${when} has been cancelled. Reply to book another time.`
  if (contact.email) await sendUtility(db, cfg, contact, 'email', { subject: `Viewing ${kind === 'reminder' ? 'reminder' : kind} — ${what}`, text })
  const t = env()
  if (contact.phone && t.viewingTemplate && kind !== 'cancelled') {
    await sendUtility(db, cfg, contact, 'whatsapp', { text, template: { name: t.viewingTemplate, params: [contact.name?.split(/\s+/)[0] ?? 'there', what, when] } })
  }
}

export async function updateViewingStatus(db: SupabaseClient, cfg: MessagingConfig, id: string, status: Viewing['status']): Promise<Viewing> {
  const v = must(await db.from('viewings').select('*').eq('id', id).single()) as Viewing
  const patch: Partial<Viewing> = { status }
  if (status === 'confirmed' && !v.confirmation_sent_at) patch.confirmation_sent_at = new Date().toISOString()
  must(await db.from('viewings').update(patch).eq('id', id))
  const updated = { ...v, ...patch }
  if (status === 'confirmed' && !v.confirmation_sent_at) await notifyViewing(db, cfg, updated, 'confirmed')
  if (status === 'cancelled' && v.status !== 'cancelled') await notifyViewing(db, cfg, updated, 'cancelled')
  if (v.lead_id && (status === 'confirmed' || status === 'completed')) {
    await db.from('leads').update({ status: status === 'completed' ? 'qualified' : 'contacted' }).eq('id', v.lead_id).in('status', ['new', 'contacted'])
  }
  return updated
}

export async function sendViewingReminders(db: SupabaseClient, cfg: MessagingConfig, now = new Date()): Promise<number> {
  const upcoming = must(await db.from('viewings').select('*').eq('status', 'confirmed').is('reminder_sent_at', null)
    .gte('scheduled_at', now.toISOString()).lte('scheduled_at', new Date(now.getTime() + 26 * 3_600_000).toISOString())) as Viewing[]
  let sent = 0
  for (const v of upcoming.filter(v => dueForReminder(v, now))) {
    must(await db.from('viewings').update({ reminder_sent_at: now.toISOString() }).eq('id', v.id))
    await notifyViewing(db, cfg, v, 'reminder')
    sent++
  }
  return sent
}

// ── Saved searches & new-listing alerts ─────────────────────────────────────

export async function createSavedSearch(db: SupabaseClient, input: {
  name?: string | null; email?: string | null; phone?: string | null; channel: Channel; criteria: SearchCriteria; ip?: string | null
}): Promise<{ id: string }> {
  const contact = await ensureContact(db, { name: input.name, email: input.email, phone: input.phone })
  if (!contact) throw new Error('A valid email or WhatsApp number is required')
  if (input.channel === 'email' && !contact.email) throw new Error('Enter an email address for email alerts')
  if (input.channel === 'whatsapp' && !contact.phone) throw new Error('Enter a WhatsApp number for WhatsApp alerts')
  const opted = input.channel === 'email' ? contact.email_consent : contact.whatsapp_consent
  if (opted === 'opted_out') throw new Error('This address previously unsubscribed. Reply START on WhatsApp or contact us to re-subscribe.')

  const at = new Date().toISOString()
  const src = `property_alert_signup${input.ip ? ` ip=${input.ip}` : ''}`
  await new SupabaseMessagingStore(db).updateContact(contact.id, input.channel === 'email'
    ? { email_consent: 'opted_in', email_consent_at: at, email_consent_source: src }
    : { whatsapp_consent: 'opted_in', whatsapp_consent_at: at, whatsapp_consent_source: src })

  return must(await db.from('saved_searches').insert({ contact_id: contact.id, channel: input.channel, criteria: input.criteria }).select('id').single()) as { id: string }
}

/** Matches recent listings against active saved searches and notifies each match once. */
export async function sendPropertyAlerts(db: SupabaseClient, cfg: MessagingConfig, now = new Date(), maxPerRun = 50): Promise<number> {
  if (!isWithinSendWindow(now, cfg.sendWindow)) return 0
  const since = new Date(now.getTime() - 14 * 86_400_000).toISOString()
  const props = must(await db.from('properties').select('*').eq('status', 'available').gte('created_at', since)) as Property[]
  if (!props.length) return 0
  const searches = must(await db.from('saved_searches').select('*, contact:audience_contacts(*)').eq('active', true)) as Array<{
    id: string; channel: Channel; criteria: SearchCriteria; created_at: string; contact: AudienceContact
  }>
  if (!searches.length) return 0
  const sentRows = must(await db.from('property_alerts_sent').select('search_id, property_id').in('search_id', searches.map(s => s.id))) as Array<{ search_id: string; property_id: string }>
  const already = new Set(sentRows.map(r => `${r.search_id}:${r.property_id}`))
  const areaNames = new Map((must(await db.from('areas').select('id, name')) as Array<{ id: string; name: string }>).map(a => [a.id, a.name]))
  const store = new SupabaseMessagingStore(db)
  const t = env()
  let sent = 0

  for (const s of searches) {
    // Only listings added after the person signed up.
    const matches = props.filter(p => p.created_at > s.created_at && !already.has(`${s.id}:${p.id}`) && matchesSearch(p, s.criteria))
    if (!matches.length) continue
    const address = s.channel === 'email' ? normalizeEmail(s.contact.email) : normalizePhone(s.contact.phone)
    const suppressed = !!address && (await store.suppressedSet(s.channel, [address])).has(address)
    if (!address || !checkEligibility(s.channel, 'marketing', s.contact, suppressed).ok) continue
    if (s.channel === 'whatsapp' && !t.alertTemplate) continue

    for (const p of matches) {
      if (sent >= maxPerRun) return sent
      must(await db.from('property_alerts_sent').insert({ search_id: s.id, property_id: p.id }))
      const link = propertyUrl(cfg.siteUrl, p)
      const label = describeSearch(s.criteria, s.criteria.area_id ? areaNames.get(s.criteria.area_id) : null)
      let r: SendResult
      let body: string
      if (s.channel === 'email') {
        const unsub = unsubscribeUrl(cfg.siteUrl, s.contact.unsubscribe_token)
        body = `A new listing matches your alert (${label}):\n\n${p.title}\n${p.location ?? ''}\n${link}\n\nUnsubscribe: ${unsub}`
        r = await sendSingleEmail(cfg, {
          to: address, subject: `New match: ${p.title}`, text: body,
          html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6"><p>A new listing matches your alert <b>${escapeHtml(label)}</b>:</p><p><a href="${link}"><b>${escapeHtml(p.title)}</b></a><br/>${escapeHtml(p.location ?? '')}</p><p style="font-size:12px;color:#94a3b8">You signed up for property alerts. <a href="${unsub}">Unsubscribe</a></p></div>`,
          headers: listUnsubscribeHeaders(oneClickUnsubscribeUrl(cfg.siteUrl, s.contact.unsubscribe_token), cfg.email.unsubscribeMailto),
        })
      } else {
        body = `[template ${t.alertTemplate}] ${p.title} | ${link}`
        r = await sendWhatsAppTemplate(cfg, address, t.alertTemplate, t.templateLang, [s.contact.name?.split(/\s+/)[0] ?? 'there', p.title, link])
      }
      await store.insertMessages([{
        contact_id: s.contact.id, channel: s.channel, direction: 'outbound', category: 'marketing', to_address: address,
        subject: s.channel === 'email' ? `New match: ${p.title}` : null, body, template_name: s.channel === 'whatsapp' ? t.alertTemplate : null,
        status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error ?? null, provider_message_id: r.providerId ?? null,
        sent_at: r.ok ? now.toISOString() : null,
      }])
      if (r.ok) sent++
    }
  }
  return sent
}

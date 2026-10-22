import {
  addressFor, checkEligibility, emailDailyCap, healthBreaker, isOptInMessage, isOptOutMessage,
  isWithinSendWindow, isWithinServiceWindow, normalizeEmail, normalizePhone, remainingCapacity,
  type SendWindow,
} from './compliance'
import type { MessagingConfig } from './config'
import {
  sendEmailBatch, sendSingleEmail, sendWhatsAppTemplate, sendWhatsAppText, fetchReceivedEmail,
  type OutboundEmail,
} from './providers'
import {
  buildMarketingEmail, contactVars, escapeHtml, listUnsubscribeHeaders, oneClickUnsubscribeUrl,
  resolveTemplateParams, unsubscribeUrl,
} from './render'
import type { MessagingStore, NewMessage } from './store'
import type { AudienceContact, Campaign, Channel, Message, MessageStatus } from './types'
import { stripQuotedReply, type NormalizedEvent } from './webhook-parsers'

const DAY_MS = 86_400_000

// ── Campaign launch ─────────────────────────────────────────────────────────

export interface LaunchResult { queued: number; skipped: Record<string, number> }

export async function launchCampaign(store: MessagingStore, campaignId: string, now = new Date()): Promise<LaunchResult> {
  const campaign = await store.getCampaign(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error(`Campaign is ${campaign.status}, only drafts can be launched`)
  if (campaign.channel === 'email' && (!campaign.email_subject || !campaign.email_html)) throw new Error('Email subject and body are required')
  if (campaign.channel === 'whatsapp' && !campaign.wa_template_name) throw new Error('An approved WhatsApp template name is required')

  const contacts = await store.audience(campaign.audience_filter ?? {})
  const addresses = contacts.map(c => addressFor(campaign.channel, c)).filter((a): a is string => !!a)
  const suppressed = await store.suppressedSet(campaign.channel, addresses)

  const skipped: Record<string, number> = {}
  const seen = new Set<string>()
  const rows: NewMessage[] = []

  for (const c of contacts) {
    const address = addressFor(campaign.channel, c)
    const elig = checkEligibility(campaign.channel, campaign.category, c, !!address && suppressed.has(address))
    if (!elig.ok) { skipped[elig.reason] = (skipped[elig.reason] ?? 0) + 1; continue }
    if (seen.has(address!)) { skipped.duplicate = (skipped.duplicate ?? 0) + 1; continue }
    seen.add(address!)
    rows.push({
      campaign_id: campaign.id, contact_id: c.id, channel: campaign.channel, direction: 'outbound',
      category: campaign.category, to_address: address!, status: 'queued',
      template_name: campaign.wa_template_name ?? null,
    })
  }

  await store.insertMessages(rows)
  const skippedCount = Object.values(skipped).reduce((a, b) => a + b, 0)
  await store.updateCampaign(campaign.id, {
    status: rows.length ? 'sending' : 'completed',
    total_recipients: rows.length,
    skipped_count: skippedCount,
    started_at: now.toISOString(),
    completed_at: rows.length ? null : now.toISOString(),
    pause_reason: null,
  })
  return { queued: rows.length, skipped }
}

// ── Dispatch planning (pure) ────────────────────────────────────────────────

export interface PlanInput {
  queued: Message[]
  contacts: Map<string, AudienceContact>
  campaigns: Map<string, Campaign>
  suppressed: Set<string>
  capacity: number
  now: Date
  window: SendWindow
}

export interface Plan {
  send: Array<{ message: Message; contact: AudienceContact; campaign: Campaign }>
  skip: Array<{ message: Message; reason: string }>
  deferred: string | null
}

/**
 * Decides what goes out in this run. Eligibility is re-checked at send time
 * because people may unsubscribe, bounce or complain after the campaign was queued.
 */
export function planBatch(input: PlanInput): Plan {
  const plan: Plan = { send: [], skip: [], deferred: null }
  const marketing = input.queued.some(m => m.category === 'marketing')
  if (marketing && !isWithinSendWindow(input.now, input.window)) {
    plan.deferred = 'outside_send_window'
    return plan
  }
  for (const message of input.queued) {
    const campaign = message.campaign_id ? input.campaigns.get(message.campaign_id) : undefined
    const contact = message.contact_id ? input.contacts.get(message.contact_id) : undefined
    if (!campaign || campaign.status !== 'sending') continue
    if (!contact) { plan.skip.push({ message, reason: 'contact_deleted' }); continue }
    const elig = checkEligibility(message.channel, message.category, contact, input.suppressed.has(message.to_address))
    if (!elig.ok) { plan.skip.push({ message, reason: elig.reason }); continue }
    if (plan.send.length >= input.capacity) { plan.deferred = 'daily_cap_reached'; break }
    plan.send.push({ message, contact, campaign })
  }
  return plan
}

// ── Dispatcher (IO) ─────────────────────────────────────────────────────────

export interface DispatchResult {
  channel: Channel
  sent: number
  failed: number
  skipped: number
  deferred: string | null
  paused: string | null
  capacityLeft: number
}

async function pauseChannel(store: MessagingStore, channel: Channel, reason: string) {
  for (const c of await store.sendingCampaigns(channel)) {
    await store.updateCampaign(c.id, { status: 'paused', pause_reason: reason })
  }
}

export async function dispatchChannel(store: MessagingStore, cfg: MessagingConfig, channel: Channel, now = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = { channel, sent: 0, failed: 0, skipped: 0, deferred: null, paused: null, capacityLeft: 0 }

  const breaker = healthBreaker(channel, await store.health(channel))
  if (breaker) {
    await pauseChannel(store, channel, breaker)
    result.paused = breaker
    return result
  }

  const since = new Date(now.getTime() - DAY_MS).toISOString()
  const cap = channel === 'email'
    ? emailDailyCap(await store.firstSendAt(channel), now, cfg.email.maxDailyCap)
    : cfg.whatsapp.dailyCap
  const capacity = remainingCapacity(cap, await store.sentVolumeSince(channel, since))
  const batchSize = channel === 'email' ? cfg.email.batchSize : cfg.whatsapp.batchSize

  // Over-fetch so skipped rows don't starve the batch.
  const queued = await store.queuedForSending(channel, Math.min(batchSize, capacity) * 2 + 10)
  if (!queued.length) { result.capacityLeft = capacity; return result }
  if (capacity === 0) { result.deferred = 'daily_cap_reached'; return result }

  const contactIds = Array.from(new Set(queued.map(m => m.contact_id).filter((x): x is string => !!x)))
  const campaignIds = Array.from(new Set(queued.map(m => m.campaign_id).filter((x): x is string => !!x)))
  const [contacts, campaigns, suppressed] = await Promise.all([
    store.getContactsByIds(contactIds),
    store.getCampaigns(campaignIds),
    store.suppressedSet(channel, queued.map(m => m.to_address)),
  ])

  const plan = planBatch({
    queued,
    contacts: new Map(contacts.map(c => [c.id, c])),
    campaigns: new Map(campaigns.map(c => [c.id, c])),
    suppressed,
    capacity: Math.min(batchSize, capacity),
    now,
    window: cfg.sendWindow,
  })
  result.deferred = plan.deferred

  for (const s of plan.skip) {
    await store.updateMessage(s.message.id, { status: 'skipped', error: s.reason })
    result.skipped++
  }

  const nowIso = now.toISOString()
  if (channel === 'email' && plan.send.length) {
    const postal = (await store.getSetting('business_postal_address')) ?? ''
    const emails: OutboundEmail[] = plan.send.map(({ message, contact, campaign }) => {
      const vars = contactVars(contact, unsubscribeUrl(cfg.siteUrl, contact.unsubscribe_token))
      const built = buildMarketingEmail({
        subjectTpl: campaign.email_subject ?? '', htmlTpl: campaign.email_html ?? '',
        textTpl: campaign.email_text, vars, postalAddress: postal,
      })
      return {
        to: message.to_address, ...built,
        headers: listUnsubscribeHeaders(oneClickUnsubscribeUrl(cfg.siteUrl, contact.unsubscribe_token), cfg.email.unsubscribeMailto),
        tags: [{ name: 'campaign_id', value: campaign.id }],
      }
    })
    const results = await sendEmailBatch(cfg, emails, `dispatch-${plan.send[0].message.id}`)
    for (let i = 0; i < results.length; i++) {
      const { message } = plan.send[i]
      const r = results[i]
      await store.updateMessage(message.id, r.ok
        ? { status: 'sent', provider_message_id: r.providerId, sent_at: nowIso, subject: emails[i].subject, body: emails[i].text }
        : { status: 'failed', error: r.error })
      if (r.ok) result.sent++; else result.failed++
    }
  }

  if (channel === 'whatsapp') {
    for (const { message, contact, campaign } of plan.send) {
      const vars = contactVars(contact, unsubscribeUrl(cfg.siteUrl, contact.unsubscribe_token))
      const params = resolveTemplateParams(campaign.wa_template_params ?? [], vars)
      const r = await sendWhatsAppTemplate(cfg, message.to_address, campaign.wa_template_name!, campaign.wa_template_lang ?? 'en', params)
      await store.updateMessage(message.id, r.ok
        ? { status: 'sent', provider_message_id: r.providerId, sent_at: nowIso, body: `[template ${campaign.wa_template_name}] ${params.join(' | ')}` }
        : { status: 'failed', error: r.error })
      if (r.ok) result.sent++; else result.failed++
    }
  }

  for (const id of campaignIds) {
    if ((await store.countQueued(id)) === 0) {
      await store.updateCampaign(id, { status: 'completed', completed_at: nowIso })
    }
  }

  result.capacityLeft = Math.max(0, capacity - result.sent)
  return result
}

// ── Webhook event handling ──────────────────────────────────────────────────

const STATUS_RANK: Record<MessageStatus, number> = {
  queued: 0, skipped: 0, received: 0, sent: 1, delivered: 2, read: 3, failed: 4, bounced: 5, complained: 6,
}

async function getOrCreateInboundContact(store: MessagingStore, channel: Channel, address: string, name?: string): Promise<AudienceContact> {
  const existing = await store.findContactByAddress(channel, address)
  if (existing) return existing
  return store.createContact({
    name: name ?? null,
    email: channel === 'email' ? address : null,
    phone: channel === 'whatsapp' ? address : null,
    source: 'inbound',
    contact_type: 'lead',
  })
}

export async function applyEvents(store: MessagingStore, cfg: MessagingConfig, events: NormalizedEvent[]): Promise<void> {
  for (const ev of events) {
    if (ev.kind === 'quality') {
      const bad = /FLAG|DOWNGRADE|RED|LOW/i.test(ev.event)
      if (bad) await pauseChannel(store, 'whatsapp', `Meta quality update: ${ev.event}${ev.currentLimit ? ` (limit ${ev.currentLimit})` : ''}`)
      continue
    }
    if (ev.kind === 'inbound') await handleInbound(store, cfg, ev)
    else await handleStatus(store, ev)
  }
}

async function handleInbound(store: MessagingStore, cfg: MessagingConfig, ev: Extract<NormalizedEvent, { kind: 'inbound' }>) {
  if (await store.findMessageByProviderId(ev.channel, ev.providerId)) return // provider retry

  const address = ev.channel === 'email' ? normalizeEmail(ev.from) : normalizePhone('+' + ev.from)
  if (!address) return

  let body = ev.body
  let messageIdHeader = ev.messageIdHeader ?? null
  if (ev.channel === 'email' && ev.emailId) {
    const full = await fetchReceivedEmail(cfg, ev.emailId)
    if (full) {
      body = stripQuotedReply(full.text ?? (full.html ? full.html.replace(/<[^>]+>/g, ' ') : ''))
      messageIdHeader = full.message_id ?? messageIdHeader
    }
  }

  const contact = await getOrCreateInboundContact(store, ev.channel, address, ev.fromName)
  await store.insertMessages([{
    contact_id: contact.id, channel: ev.channel, direction: 'inbound', category: 'utility',
    to_address: 'business', from_address: address, subject: ev.subject ?? null, body,
    status: 'received', provider_message_id: ev.providerId, external_ref: messageIdHeader,
  }])

  const patch: Partial<AudienceContact> = ev.channel === 'whatsapp'
    ? { last_inbound_whatsapp_at: ev.at }
    : { last_inbound_email_at: ev.at }
  if (!contact.name && ev.fromName) patch.name = ev.fromName

  const keywordText = ev.channel === 'email' ? (ev.subject && isOptOutMessage(ev.subject) ? ev.subject : (body ?? '').split('\n')[0]) : body
  if (isOptOutMessage(keywordText)) {
    await store.suppress(ev.channel, address, 'stop_keyword', `Inbound: "${(keywordText ?? '').slice(0, 50)}"`)
    if (ev.channel === 'whatsapp') {
      patch.whatsapp_consent = 'opted_out'; patch.whatsapp_consent_at = ev.at; patch.whatsapp_consent_source = 'stop_keyword'
      // Allowed: the user just messaged us, so the 24h service window is open.
      await sendWhatsAppText(cfg, address, 'You have been unsubscribed and will not receive further messages from us. Reply START to subscribe again.')
    } else {
      patch.email_consent = 'opted_out'; patch.email_consent_at = ev.at; patch.email_consent_source = 'reply_keyword'
    }
  } else if (ev.channel === 'whatsapp' && isOptInMessage(body)) {
    await store.unsuppress('whatsapp', address, ['stop_keyword', 'unsubscribed'])
    patch.whatsapp_consent = 'opted_in'; patch.whatsapp_consent_at = ev.at; patch.whatsapp_consent_source = 'whatsapp_keyword'
    await sendWhatsAppText(cfg, address, 'You are subscribed to updates from us. Reply STOP at any time to unsubscribe.')
  }

  await store.updateContact(contact.id, patch)
}

async function handleStatus(store: MessagingStore, ev: Extract<NormalizedEvent, { kind: 'status' }>) {
  const msg = await store.findMessageByProviderId(ev.channel, ev.providerId)

  if (msg && STATUS_RANK[ev.status] > STATUS_RANK[msg.status]) {
    const patch: Partial<Message> = { status: ev.status }
    if (ev.status === 'delivered') patch.delivered_at = ev.at
    if (ev.status === 'read') patch.read_at = ev.at
    if (ev.error) patch.error = ev.error
    await store.updateMessage(msg.id, patch)
  }

  const address = ev.recipient
    ? (ev.channel === 'email' ? normalizeEmail(ev.recipient) : normalizePhone('+' + ev.recipient))
    : msg?.to_address ?? null
  if (!address) return

  if (ev.channel === 'email' && ev.status === 'bounced' && ev.permanent) {
    await store.suppress('email', address, 'hard_bounce', ev.error)
  }
  if (ev.channel === 'email' && ev.status === 'complained') {
    await store.suppress('email', address, 'complaint')
    const c = await store.findContactByAddress('email', address)
    if (c) await store.updateContact(c.id, { email_consent: 'opted_out', email_consent_at: ev.at, email_consent_source: 'spam_complaint' })
  }
  if (ev.channel === 'whatsapp' && ev.status === 'failed' && ev.permanent) {
    if (ev.errorCode === 131050) {
      const c = await store.findContactByAddress('whatsapp', address)
      if (c) await store.updateContact(c.id, { whatsapp_consent: 'opted_out', whatsapp_consent_at: ev.at, whatsapp_consent_source: 'meta_marketing_stop' })
      await store.suppress('whatsapp', address, 'marketing_blocked', ev.error)
    } else {
      await store.suppress('whatsapp', address, 'invalid', ev.error)
    }
  }
}

// ── Unsubscribe ─────────────────────────────────────────────────────────────

export async function unsubscribeByToken(store: MessagingStore, token: string, channels: Channel[] = ['email', 'whatsapp'], now = new Date()): Promise<AudienceContact | null> {
  const contact = await store.getContactByToken(token)
  if (!contact) return null
  const at = now.toISOString()
  const patch: Partial<AudienceContact> = {}
  for (const ch of channels) {
    const address = addressFor(ch, contact)
    if (address) await store.suppress(ch, address, 'unsubscribed', 'unsubscribe link')
    if (ch === 'email') Object.assign(patch, { email_consent: 'opted_out', email_consent_at: at, email_consent_source: 'unsubscribe_link' })
    else Object.assign(patch, { whatsapp_consent: 'opted_out', whatsapp_consent_at: at, whatsapp_consent_source: 'unsubscribe_link' })
  }
  await store.updateContact(contact.id, patch)
  return contact
}

// ── 1:1 replies from the admin inbox ────────────────────────────────────────

export async function sendReply(
  store: MessagingStore, cfg: MessagingConfig,
  opts: { contactId: string; channel: Channel; body: string; subject?: string }, now = new Date(),
): Promise<Message> {
  const contact = await store.getContact(opts.contactId)
  if (!contact) throw new Error('Contact not found')
  const address = addressFor(opts.channel, contact)
  if (!address) throw new Error(`Contact has no valid ${opts.channel === 'email' ? 'email' : 'WhatsApp number'}`)
  if ((await store.suppressedSet(opts.channel, [address])).has(address)) throw new Error('This contact has opted out on this channel')
  const body = opts.body.trim()
  if (!body) throw new Error('Message is empty')

  let r
  let subject: string | null = null
  if (opts.channel === 'whatsapp') {
    if (!isWithinServiceWindow(contact.last_inbound_whatsapp_at, now)) {
      throw new Error('The 24-hour WhatsApp reply window is closed. Use an approved template campaign to re-engage this contact.')
    }
    r = await sendWhatsAppText(cfg, address, body)
  } else {
    const last = await store.lastInboundRef(contact.id, 'email')
    subject = opts.subject?.trim() || (last?.subject ? (/^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`) : 'Following up')
    const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${escapeHtml(body).replace(/\n/g, '<br/>')}</div>`
    r = await sendSingleEmail(cfg, { to: address, subject, html, text: body, inReplyTo: last?.external_ref ?? undefined })
  }
  if (!r.ok) throw new Error(r.error ?? 'Send failed')

  const [msg] = await store.insertMessages([{
    contact_id: contact.id, channel: opts.channel, direction: 'outbound', category: 'utility',
    to_address: address, subject, body, status: 'sent', provider_message_id: r.providerId, sent_at: now.toISOString(),
  }])
  return msg
}

// ── Lead form → audience (with explicit, timestamped consent) ───────────────

export async function upsertContactFromLead(store: MessagingStore, lead: {
  id: string; name: string; email: string | null; phone: string; country_code: string | null
  consent_email: boolean; consent_whatsapp: boolean; ip?: string | null
}, now = new Date()): Promise<void> {
  const email = normalizeEmail(lead.email)
  const phone = normalizePhone(lead.phone, (lead.country_code ?? '').replace(/\D/g, '') || '971')
  const existing = (email && await store.findContactByAddress('email', email)) || (phone && await store.findContactByAddress('whatsapp', phone)) || null
  const at = now.toISOString()
  const src = `lead_form${lead.ip ? ` ip=${lead.ip}` : ''}`

  const consent: Partial<AudienceContact> = {}
  if (lead.consent_email && email) Object.assign(consent, { email_consent: 'opted_in', email_consent_at: at, email_consent_source: src })
  if (lead.consent_whatsapp && phone) Object.assign(consent, { whatsapp_consent: 'opted_in', whatsapp_consent_at: at, whatsapp_consent_source: src })

  if (existing) {
    // Never silently override an explicit opt-out with a form tick — require keyword/explicit re-subscribe.
    if (existing.email_consent === 'opted_out') { delete consent.email_consent; delete consent.email_consent_at; delete consent.email_consent_source }
    if (existing.whatsapp_consent === 'opted_out') { delete consent.whatsapp_consent; delete consent.whatsapp_consent_at; delete consent.whatsapp_consent_source }
    await store.updateContact(existing.id, {
      ...consent, lead_id: lead.id,
      email: existing.email ?? email, phone: existing.phone ?? phone, name: existing.name ?? lead.name,
    })
    return
  }
  await store.createContact({ name: lead.name, email, phone, source: 'lead_form', contact_type: 'lead', lead_id: lead.id, ...consent })
}

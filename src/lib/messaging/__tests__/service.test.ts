import { beforeEach, describe, expect, it } from 'vitest'
import { messagingConfig } from '../config'
import { importContacts } from '../import'
import { applyEvents, dispatchChannel, launchCampaign, sendReply, unsubscribeByToken, upsertContactFromLead } from '../service'
import { parseResendWebhook, parseWhatsAppWebhook } from '../webhook-parsers'
import { MemoryStore, makeCampaign, makeContact } from './memory-store'

process.env.MESSAGING_DRY_RUN = 'true'
const cfg = () => messagingConfig()

const OFFICE_HOURS = new Date('2026-10-22T06:00:00Z') // 10:00 Dubai
const NIGHT = new Date('2026-10-22T20:00:00Z')        // 00:00 Dubai

let store: MemoryStore
beforeEach(() => { store = new MemoryStore() })

function seedEmailAudience() {
  store.contacts.push(
    makeContact({ email: 'optin@x.com', email_consent: 'opted_in', tags: ['investors'] }),
    makeContact({ email: 'client@x.com', email_consent: 'implied', tags: ['investors'] }),
    makeContact({ email: 'cold@x.com', email_consent: 'unknown', tags: ['investors'] }),
    makeContact({ email: 'gone@x.com', email_consent: 'opted_out', tags: ['investors'] }),
    makeContact({ email: 'bounced@x.com', email_consent: 'opted_in', tags: ['investors'] }),
    makeContact({ email: 'other@x.com', email_consent: 'opted_in', tags: ['tenants'] }),
  )
  store.suppressions.push({ id: 's', channel: 'email', address: 'bounced@x.com', reason: 'hard_bounce', detail: null, created_at: '' })
}

describe('launchCampaign', () => {
  it('queues only eligible contacts in the audience and reports why others were skipped', async () => {
    seedEmailAudience()
    const c = makeCampaign({ audience_filter: { tags: ['investors'] } })
    store.campaigns.push(c)

    const res = await launchCampaign(store, c.id, OFFICE_HOURS)

    expect(res.queued).toBe(2)
    expect(res.skipped).toEqual({ no_email_consent: 1, opted_out: 1, suppressed: 1 })
    expect(store.messages.map(m => m.to_address).sort()).toEqual(['client@x.com', 'optin@x.com'])
    expect(c.status).toBe('sending')
    expect(c.total_recipients).toBe(2)
  })

  it('refuses to relaunch a non-draft and validates content', async () => {
    const c = makeCampaign({ status: 'completed' })
    const wa = makeCampaign({ channel: 'whatsapp', wa_template_name: null })
    store.campaigns.push(c, wa)
    await expect(launchCampaign(store, c.id)).rejects.toThrow(/only drafts/)
    await expect(launchCampaign(store, wa.id)).rejects.toThrow(/template/)
  })
})

describe('dispatchChannel (email)', () => {
  it('sends with personalization, unsubscribe footer and completes the campaign', async () => {
    store.contacts.push(makeContact({ name: 'Sara Khan', email: 'sara@x.com', email_consent: 'opted_in' }))
    const c = makeCampaign({ email_subject: 'Hi {{first_name}}', email_html: '<p>Dear {{name}}</p>' })
    store.campaigns.push(c)
    await launchCampaign(store, c.id, OFFICE_HOURS)

    const r = await dispatchChannel(store, cfg(), 'email', OFFICE_HOURS)

    expect(r).toMatchObject({ sent: 1, failed: 0, skipped: 0, paused: null })
    const m = store.messages[0]
    expect(m.status).toBe('sent')
    expect(m.provider_message_id).toMatch(/^dryrun_email_/)
    expect(m.subject).toBe('Hi Sara')
    expect(m.body).toContain('Unsubscribe: http://localhost:3000/unsubscribe?t=')
    expect(c.status).toBe('completed')
  })

  it('does not send marketing outside the 09:00–18:00 Dubai window', async () => {
    store.contacts.push(makeContact({ email: 'a@x.com', email_consent: 'opted_in' }))
    const c = makeCampaign(); store.campaigns.push(c)
    await launchCampaign(store, c.id, NIGHT)

    const r = await dispatchChannel(store, cfg(), 'email', NIGHT)
    expect(r).toMatchObject({ sent: 0, deferred: 'outside_send_window' })
    expect(store.messages[0].status).toBe('queued')
  })

  it('respects the warm-up cap: a new domain sends at most 50 per 24h', async () => {
    for (let i = 0; i < 80; i++) store.contacts.push(makeContact({ email: `u${i}@x.com`, email_consent: 'opted_in' }))
    const c = makeCampaign(); store.campaigns.push(c)
    await launchCampaign(store, c.id, OFFICE_HOURS)

    let total = 0
    for (let run = 0; run < 5; run++) total += (await dispatchChannel(store, cfg(), 'email', OFFICE_HOURS)).sent
    expect(total).toBe(50)
    const last = await dispatchChannel(store, cfg(), 'email', OFFICE_HOURS)
    expect(last.deferred).toBe('daily_cap_reached')
    expect(c.status).toBe('sending')

    // Next day, the remaining 30 go out.
    const tomorrow = new Date(OFFICE_HOURS.getTime() + 86_400_000 + 60_000)
    let more = 0
    for (let run = 0; run < 3; run++) more += (await dispatchChannel(store, cfg(), 'email', tomorrow)).sent
    expect(more).toBe(30)
    expect(c.status).toBe('completed')
  })

  it('re-checks suppression at send time (someone unsubscribed after queueing)', async () => {
    const contact = makeContact({ email: 'late@x.com', email_consent: 'opted_in' })
    store.contacts.push(contact)
    const c = makeCampaign(); store.campaigns.push(c)
    await launchCampaign(store, c.id, OFFICE_HOURS)

    await unsubscribeByToken(store, contact.unsubscribe_token, ['email'])
    const r = await dispatchChannel(store, cfg(), 'email', OFFICE_HOURS)

    expect(r).toMatchObject({ sent: 0, skipped: 1 })
    expect(store.messages[0]).toMatchObject({ status: 'skipped' })
  })

  it('circuit breaker pauses all sending campaigns when complaints spike', async () => {
    store.contacts.push(makeContact({ email: 'a@x.com', email_consent: 'opted_in' }))
    const c = makeCampaign(); store.campaigns.push(c)
    await launchCampaign(store, c.id, OFFICE_HOURS)
    store.healthOverride.email = { attempted: 500, bounced: 0, complained: 3, failed: 0 }

    const r = await dispatchChannel(store, cfg(), 'email', OFFICE_HOURS)
    expect(r.paused).toMatch(/complaint/i)
    expect(c.status).toBe('paused')
    expect(c.pause_reason).toMatch(/complaint/i)
  })
})

describe('dispatchChannel (WhatsApp)', () => {
  it('sends approved templates only to opted-in numbers, capped by tier', async () => {
    process.env.WHATSAPP_DAILY_CAP = '3'
    for (let i = 0; i < 5; i++) store.contacts.push(makeContact({ name: `P${i}`, phone: `97150000000${i}`, whatsapp_consent: 'opted_in' }))
    store.contacts.push(makeContact({ phone: '971509999999', whatsapp_consent: 'unknown' }))
    const c = makeCampaign({ channel: 'whatsapp', wa_template_name: 'new_launch', wa_template_params: ['{{first_name}}'] })
    store.campaigns.push(c)

    const launch = await launchCampaign(store, c.id, OFFICE_HOURS)
    expect(launch).toEqual({ queued: 5, skipped: { no_whatsapp_opt_in: 1 } })

    const r = await dispatchChannel(store, cfg(), 'whatsapp', OFFICE_HOURS)
    expect(r.sent).toBe(3)
    expect((await dispatchChannel(store, cfg(), 'whatsapp', OFFICE_HOURS)).deferred).toBe('daily_cap_reached')
    expect(store.messages.find(m => m.status === 'sent')!.body).toBe('[template new_launch] P0')
    delete process.env.WHATSAPP_DAILY_CAP
  })
})

describe('inbound replies and opt-out handling', () => {
  const waInbound = (from: string, body: string, id: string, ts = '1761127200') => parseWhatsAppWebhook({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { contacts: [{ wa_id: from, profile: { name: 'Omar' } }], messages: [{ id, from, timestamp: ts, type: 'text', text: { body } }] } }] }],
  })

  it('stores an inbound WhatsApp message, creates the contact and opens the 24h window', async () => {
    await applyEvents(store, cfg(), waInbound('971501112222', 'Is the Marina flat available?', 'wamid.A'))
    const contact = store.contacts[0]
    expect(contact).toMatchObject({ phone: '971501112222', name: 'Omar', source: 'inbound' })
    expect(contact.last_inbound_whatsapp_at).toBeTruthy()
    expect(store.messages[0]).toMatchObject({ direction: 'inbound', status: 'received', body: 'Is the Marina flat available?' })
  })

  it('ignores provider retries (same message id twice)', async () => {
    await applyEvents(store, cfg(), waInbound('971501112222', 'hi', 'wamid.B'))
    await applyEvents(store, cfg(), waInbound('971501112222', 'hi', 'wamid.B'))
    expect(store.messages.filter(m => m.direction === 'inbound')).toHaveLength(1)
  })

  it('STOP suppresses the number, flips consent, and blocks future campaigns', async () => {
    store.contacts.push(makeContact({ phone: '971501112222', whatsapp_consent: 'opted_in' }))
    await applyEvents(store, cfg(), waInbound('971501112222', 'STOP', 'wamid.C'))

    expect(store.suppressions).toMatchObject([{ channel: 'whatsapp', address: '971501112222', reason: 'stop_keyword' }])
    expect(store.contacts[0].whatsapp_consent).toBe('opted_out')

    const c = makeCampaign({ channel: 'whatsapp', wa_template_name: 't' }); store.campaigns.push(c)
    expect((await launchCampaign(store, c.id)).queued).toBe(0)
  })

  it('START after STOP re-subscribes', async () => {
    await applyEvents(store, cfg(), waInbound('971501112222', 'توقف', 'wamid.D'))
    await applyEvents(store, cfg(), waInbound('971501112222', 'START', 'wamid.E'))
    expect(store.suppressions).toHaveLength(0)
    expect(store.contacts[0].whatsapp_consent).toBe('opted_in')
  })

  it('email reply with "unsubscribe" opts the contact out of email', async () => {
    store.contacts.push(makeContact({ email: 'jane@corp.com', email_consent: 'implied' }))
    await applyEvents(store, cfg(), parseResendWebhook({ type: 'email.received', data: { email_id: 'r1', from: 'Jane <jane@corp.com>', subject: 'Unsubscribe' } }))
    expect(store.contacts[0].email_consent).toBe('opted_out')
    expect(store.suppressions[0]).toMatchObject({ channel: 'email', address: 'jane@corp.com' })
  })
})

describe('delivery status webhooks', () => {
  async function sentEmail(to: string) {
    store.contacts.push(makeContact({ email: to, email_consent: 'opted_in' }))
    const c = makeCampaign(); store.campaigns.push(c)
    await launchCampaign(store, c.id, OFFICE_HOURS)
    await dispatchChannel(store, cfg(), 'email', OFFICE_HOURS)
    return store.messages.find(m => m.to_address === to)!
  }

  it('hard bounce → suppression; status never regresses', async () => {
    const m = await sentEmail('dead@x.com')
    await applyEvents(store, cfg(), parseResendWebhook({ type: 'email.bounced', data: { email_id: m.provider_message_id!, to: ['dead@x.com'], bounce: { type: 'Permanent' } } }))
    await applyEvents(store, cfg(), parseResendWebhook({ type: 'email.delivered', data: { email_id: m.provider_message_id! } }))
    expect(m.status).toBe('bounced')
    expect(store.suppressions[0]).toMatchObject({ address: 'dead@x.com', reason: 'hard_bounce' })
  })

  it('soft bounce does not suppress', async () => {
    const m = await sentEmail('full@x.com')
    await applyEvents(store, cfg(), parseResendWebhook({ type: 'email.bounced', data: { email_id: m.provider_message_id!, to: ['full@x.com'], bounce: { type: 'Transient' } } }))
    expect(store.suppressions).toHaveLength(0)
  })

  it('spam complaint → suppression + opted_out', async () => {
    const m = await sentEmail('angry@x.com')
    await applyEvents(store, cfg(), parseResendWebhook({ type: 'email.complained', data: { email_id: m.provider_message_id!, to: ['angry@x.com'] } }))
    expect(store.suppressions[0]).toMatchObject({ reason: 'complaint' })
    expect(store.contacts[0].email_consent).toBe('opted_out')
  })

  it('WhatsApp 131050 (user stopped marketing) → opted out', async () => {
    store.contacts.push(makeContact({ phone: '971500000001', whatsapp_consent: 'opted_in' }))
    await applyEvents(store, cfg(), parseWhatsAppWebhook({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
      statuses: [{ id: 'x', status: 'failed', timestamp: '1', recipient_id: '971500000001', errors: [{ code: 131050, title: 'stopped' }] }],
    } }] }] }))
    expect(store.contacts[0].whatsapp_consent).toBe('opted_out')
    expect(store.suppressions[0]).toMatchObject({ reason: 'marketing_blocked' })
  })

  it('Meta quality FLAGGED pauses WhatsApp campaigns', async () => {
    const c = makeCampaign({ channel: 'whatsapp', status: 'sending' }); store.campaigns.push(c)
    await applyEvents(store, cfg(), [{ kind: 'quality', channel: 'whatsapp', event: 'FLAGGED' }])
    expect(c.status).toBe('paused')
  })
})

describe('sendReply (admin inbox)', () => {
  it('allows free-form WhatsApp within 24h, refuses after', async () => {
    const now = new Date('2026-10-22T10:00:00Z')
    const fresh = makeContact({ phone: '971501110000', last_inbound_whatsapp_at: '2026-10-22T08:00:00Z' })
    const stale = makeContact({ phone: '971501110001', last_inbound_whatsapp_at: '2026-10-20T08:00:00Z' })
    store.contacts.push(fresh, stale)

    const msg = await sendReply(store, cfg(), { contactId: fresh.id, channel: 'whatsapp', body: 'Yes, viewing at 5pm works.' }, now)
    expect(msg).toMatchObject({ direction: 'outbound', status: 'sent' })
    await expect(sendReply(store, cfg(), { contactId: stale.id, channel: 'whatsapp', body: 'hi' }, now)).rejects.toThrow(/24-hour/)
  })

  it('threads email replies with Re: subject and refuses opted-out contacts', async () => {
    const c = makeContact({ email: 'jane@corp.com' })
    store.contacts.push(c)
    await applyEvents(store, cfg(), parseResendWebhook({ type: 'email.received', data: { email_id: 'in1', from: 'jane@corp.com', subject: 'Marina 2BR', message_id: '<abc@corp>' } }))
    const msg = await sendReply(store, cfg(), { contactId: c.id, channel: 'email', body: 'Attached the floor plan.' })
    expect(msg.subject).toBe('Re: Marina 2BR')

    await unsubscribeByToken(store, c.unsubscribe_token, ['email'])
    await expect(sendReply(store, cfg(), { contactId: c.id, channel: 'email', body: 'x' })).rejects.toThrow(/opted out/)
  })
})

describe('lead form + import consent', () => {
  it('records explicit consent from the lead form ticks', async () => {
    await upsertContactFromLead(store, { id: 'L1', name: 'Ali', email: 'Ali@X.com', phone: '050 123 4567', country_code: '+971', consent_email: true, consent_whatsapp: false, ip: '1.2.3.4' })
    expect(store.contacts[0]).toMatchObject({ email: 'ali@x.com', phone: '971501234567', email_consent: 'opted_in', whatsapp_consent: 'unknown', lead_id: 'L1' })
    expect(store.contacts[0].email_consent_source).toContain('ip=1.2.3.4')
  })

  it('a later form tick never overrides an explicit opt-out', async () => {
    store.contacts.push(makeContact({ email: 'ali@x.com', email_consent: 'opted_out' }))
    await upsertContactFromLead(store, { id: 'L2', name: 'Ali', email: 'ali@x.com', phone: '0501234567', country_code: '+971', consent_email: true, consent_whatsapp: true })
    expect(store.contacts[0].email_consent).toBe('opted_out')
    expect(store.contacts[0].whatsapp_consent).toBe('opted_in')
  })

  it('import with no consent basis creates contacts that cannot receive marketing', async () => {
    const res = await importContacts(store, 'name,email,phone\nA,a@x.com,0501234567\nB,b@x.com,\n', 'none', '', ['imported-oct'])
    expect(res).toMatchObject({ created: 2, updated: 0 })
    const c = makeCampaign(); store.campaigns.push(c)
    expect((await launchCampaign(store, c.id)).skipped).toEqual({ no_email_consent: 2 })
    expect(store.contacts[0].tags).toEqual(['imported-oct'])
  })

  it('re-import merges instead of duplicating and does not override opt-outs', async () => {
    store.contacts.push(makeContact({ email: 'a@x.com', email_consent: 'opted_out', tags: ['old'] }))
    const res = await importContacts(store, 'email\na@x.com\n', 'documented_opt_in', 'event signup')
    expect(res).toMatchObject({ created: 0, updated: 1 })
    expect(store.contacts[0]).toMatchObject({ email_consent: 'opted_out', tags: ['old'] })
  })
})

describe('inbound hooks (sales automation entry point)', () => {
  const wa = (body: string, id: string) => parseWhatsAppWebhook({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    messages: [{ id, from: '971501234000', timestamp: '1761127200', type: 'text', text: { body } }] } }] }] })

  it('runs for normal messages with the stored contact, but never for STOP/START keywords', async () => {
    const calls: Array<string | null> = []
    const hooks = { onInbound: async (_c: unknown, _ch: unknown, body: string | null) => { calls.push(body) } }
    await applyEvents(store, cfg(), wa('Hi, Ref: IQ-ABC123', 'h1'), hooks)
    await applyEvents(store, cfg(), wa('STOP', 'h2'), hooks)
    await applyEvents(store, cfg(), wa('START', 'h3'), hooks)
    expect(calls).toEqual(['Hi, Ref: IQ-ABC123'])
  })

  it('a failing hook does not break message storage', async () => {
    await applyEvents(store, cfg(), wa('hello', 'h4'), { onInbound: async () => { throw new Error('boom') } })
    expect(store.messages.filter(m => m.direction === 'inbound')).toHaveLength(1)
  })
})

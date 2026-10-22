import { randomUUID } from 'node:crypto'
import type { ChannelHealth } from '../compliance'
import type { MessagingStore, NewMessage } from '../store'
import type { AudienceContact, Campaign, Channel, Message, Suppression, SuppressionReason } from '../types'

export function makeContact(p: Partial<AudienceContact> = {}): AudienceContact {
  return {
    id: randomUUID(), name: 'Test Person', company: null, email: null, phone: null,
    contact_type: 'client', source: 'manual', lead_id: null, tags: [],
    email_consent: 'unknown', email_consent_at: null, email_consent_source: null,
    whatsapp_consent: 'unknown', whatsapp_consent_at: null, whatsapp_consent_source: null,
    last_inbound_whatsapp_at: null, last_inbound_email_at: null,
    unsubscribe_token: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...p,
  }
}

export function makeCampaign(p: Partial<Campaign> = {}): Campaign {
  return {
    id: randomUUID(), name: 'Test campaign', channel: 'email', category: 'marketing', status: 'draft',
    pause_reason: null, audience_filter: {}, email_subject: 'Hello {{first_name}}',
    email_html: '<p>Hi {{name}}</p>', email_text: null, wa_template_name: null, wa_template_lang: 'en',
    wa_template_params: [], total_recipients: 0, skipped_count: 0, created_at: new Date().toISOString(),
    started_at: null, completed_at: null, ...p,
  }
}

export class MemoryStore implements MessagingStore {
  contacts: AudienceContact[] = []
  campaigns: Campaign[] = []
  messages: Message[] = []
  suppressions: Suppression[] = []
  settings: Record<string, string> = { business_postal_address: 'IQ MultiServices, Dubai, UAE' }
  healthOverride: Partial<Record<Channel, ChannelHealth>> = {}

  async getContact(id: string) { return this.contacts.find(c => c.id === id) ?? null }
  async getContactsByIds(ids: string[]) { return this.contacts.filter(c => ids.includes(c.id)) }
  async getContactByToken(t: string) { return this.contacts.find(c => c.unsubscribe_token === t) ?? null }
  async findContactByAddress(ch: Channel, a: string) {
    return this.contacts.find(c => (ch === 'email' ? c.email === a : c.phone === a)) ?? null
  }
  async createContact(c: Partial<AudienceContact>) { const n = makeContact(c); this.contacts.push(n); return n }
  async updateContact(id: string, patch: Partial<AudienceContact>) {
    const c = this.contacts.find(x => x.id === id); if (c) Object.assign(c, patch)
  }
  async audience(f: Campaign['audience_filter']) {
    return this.contacts.filter(c =>
      (!f.tags?.length || c.tags.some(t => f.tags!.includes(t))) &&
      (!f.contact_types?.length || f.contact_types.includes(c.contact_type)))
  }

  async suppressedSet(ch: Channel, addrs: string[]) {
    return new Set(this.suppressions.filter(s => s.channel === ch && addrs.includes(s.address)).map(s => s.address))
  }
  async suppress(ch: Channel, address: string, reason: SuppressionReason, detail?: string) {
    if (this.suppressions.some(s => s.channel === ch && s.address === address)) return
    this.suppressions.push({ id: randomUUID(), channel: ch, address, reason, detail: detail ?? null, created_at: new Date().toISOString() })
  }
  async unsuppress(ch: Channel, address: string, only?: SuppressionReason[]) {
    this.suppressions = this.suppressions.filter(s => !(s.channel === ch && s.address === address && (!only || only.includes(s.reason))))
  }

  async insertMessages(rows: NewMessage[]) {
    const created = rows.map(r => ({
      id: randomUUID(), campaign_id: null, contact_id: null, category: 'utility', from_address: null,
      subject: null, body: null, template_name: null, error: null, provider_message_id: null, external_ref: null,
      created_at: new Date(Date.now() + this.messages.length).toISOString(), sent_at: null, delivered_at: null, read_at: null,
      ...r,
    }) as Message)
    this.messages.push(...created)
    return created
  }
  async findMessageByProviderId(ch: Channel, pid: string) {
    return this.messages.find(m => m.channel === ch && m.provider_message_id === pid) ?? null
  }
  async updateMessage(id: string, patch: Partial<Message>) {
    const m = this.messages.find(x => x.id === id); if (m) Object.assign(m, patch)
  }
  async queuedForSending(ch: Channel, limit: number) {
    const sending = new Set(this.campaigns.filter(c => c.channel === ch && c.status === 'sending').map(c => c.id))
    return this.messages.filter(m => m.channel === ch && m.status === 'queued' && m.campaign_id && sending.has(m.campaign_id)).slice(0, limit)
  }
  async countQueued(cid: string) { return this.messages.filter(m => m.campaign_id === cid && m.status === 'queued').length }
  async sentVolumeSince(ch: Channel, since: string) {
    const sent = this.messages.filter(m => m.channel === ch && m.direction === 'outbound' && m.sent_at && m.sent_at >= since)
    return ch === 'email' ? sent.length : new Set(sent.map(m => m.to_address)).size
  }
  async firstSendAt(ch: Channel) {
    const s = this.messages.filter(m => m.channel === ch && m.direction === 'outbound' && m.sent_at).map(m => m.sent_at!).sort()
    return s[0] ?? null
  }
  async health(ch: Channel) {
    if (this.healthOverride[ch]) return this.healthOverride[ch]!
    const out = this.messages.filter(m => m.channel === ch && m.direction === 'outbound' && m.sent_at)
    return {
      attempted: out.length,
      bounced: out.filter(m => m.status === 'bounced').length,
      complained: out.filter(m => m.status === 'complained').length,
      failed: out.filter(m => m.status === 'failed').length,
    }
  }
  async lastInboundRef(cid: string, ch: Channel) {
    const m = this.messages.filter(x => x.contact_id === cid && x.channel === ch && x.direction === 'inbound').at(-1)
    return m ? { subject: m.subject, external_ref: m.external_ref } : null
  }

  async getCampaign(id: string) { return this.campaigns.find(c => c.id === id) ?? null }
  async getCampaigns(ids: string[]) { return this.campaigns.filter(c => ids.includes(c.id)) }
  async sendingCampaigns(ch: Channel) { return this.campaigns.filter(c => c.channel === ch && c.status === 'sending') }
  async updateCampaign(id: string, patch: Partial<Campaign>) {
    const c = this.campaigns.find(x => x.id === id); if (c) Object.assign(c, patch)
  }
  async getSetting(k: string) { return this.settings[k] ?? null }
}

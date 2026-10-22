import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChannelHealth } from './compliance'
import type { AudienceContact, Campaign, Channel, Message, SuppressionReason } from './types'

export type NewMessage = Omit<Partial<Message>, 'id' | 'created_at'> &
  Pick<Message, 'channel' | 'direction' | 'to_address' | 'status'>

export interface MessagingStore {
  getContact(id: string): Promise<AudienceContact | null>
  getContactsByIds(ids: string[]): Promise<AudienceContact[]>
  getContactByToken(token: string): Promise<AudienceContact | null>
  findContactByAddress(channel: Channel, address: string): Promise<AudienceContact | null>
  createContact(c: Partial<AudienceContact>): Promise<AudienceContact>
  updateContact(id: string, patch: Partial<AudienceContact>): Promise<void>
  audience(filter: Campaign['audience_filter']): Promise<AudienceContact[]>

  suppressedSet(channel: Channel, addresses: string[]): Promise<Set<string>>
  suppress(channel: Channel, address: string, reason: SuppressionReason, detail?: string): Promise<void>
  unsuppress(channel: Channel, address: string, onlyReasons?: SuppressionReason[]): Promise<void>

  insertMessages(rows: NewMessage[]): Promise<Message[]>
  findMessageByProviderId(channel: Channel, providerId: string): Promise<Message | null>
  updateMessage(id: string, patch: Partial<Message>): Promise<void>
  /** Queued messages belonging to campaigns currently in 'sending' state, oldest first. */
  queuedForSending(channel: Channel, limit: number): Promise<Message[]>
  countQueued(campaignId: string): Promise<number>
  /** Email: messages sent since; WhatsApp: distinct recipients since (Meta counts unique users). */
  sentVolumeSince(channel: Channel, sinceIso: string): Promise<number>
  firstSendAt(channel: Channel): Promise<string | null>
  health(channel: Channel): Promise<ChannelHealth | null>
  lastInboundRef(contactId: string, channel: Channel): Promise<{ subject: string | null; external_ref: string | null } | null>

  getCampaign(id: string): Promise<Campaign | null>
  getCampaigns(ids: string[]): Promise<Campaign[]>
  sendingCampaigns(channel: Channel): Promise<Campaign[]>
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<void>

  getSetting(key: string): Promise<string | null>
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export class SupabaseMessagingStore implements MessagingStore {
  constructor(private db: SupabaseClient) {}

  async getContact(id: string) {
    return must(await this.db.from('audience_contacts').select('*').eq('id', id).maybeSingle()) as AudienceContact | null
  }
  async getContactsByIds(ids: string[]) {
    if (!ids.length) return []
    return must(await this.db.from('audience_contacts').select('*').in('id', ids)) as AudienceContact[]
  }
  async getContactByToken(token: string) {
    return must(await this.db.from('audience_contacts').select('*').eq('unsubscribe_token', token).maybeSingle()) as AudienceContact | null
  }
  async findContactByAddress(channel: Channel, address: string) {
    const q = this.db.from('audience_contacts').select('*')
    // Emails are stored normalized (lowercase), so exact match is correct and avoids LIKE wildcards.
    const res = await q.eq(channel === 'email' ? 'email' : 'phone', address).limit(1)
    return (must(res) as AudienceContact[])[0] ?? null
  }
  async createContact(c: Partial<AudienceContact>) {
    return must(await this.db.from('audience_contacts').insert(c).select().single()) as AudienceContact
  }
  async updateContact(id: string, patch: Partial<AudienceContact>) {
    must(await this.db.from('audience_contacts').update(patch).eq('id', id))
  }
  async audience(filter: Campaign['audience_filter']) {
    const all: AudienceContact[] = []
    for (let from = 0; ; from += 1000) {
      let q = this.db.from('audience_contacts').select('*').order('created_at').range(from, from + 999)
      if (filter.tags?.length) q = q.overlaps('tags', filter.tags)
      if (filter.contact_types?.length) q = q.in('contact_type', filter.contact_types)
      const page = must(await q) as AudienceContact[]
      all.push(...page)
      if (page.length < 1000) break
    }
    return all
  }

  async suppressedSet(channel: Channel, addresses: string[]) {
    const set = new Set<string>()
    for (let i = 0; i < addresses.length; i += 500) {
      const chunk = addresses.slice(i, i + 500)
      const rows = must(await this.db.from('suppressions').select('address').eq('channel', channel).in('address', chunk)) as Array<{ address: string }>
      rows.forEach(r => set.add(r.address))
    }
    return set
  }
  async suppress(channel: Channel, address: string, reason: SuppressionReason, detail?: string) {
    must(await this.db.from('suppressions').upsert({ channel, address, reason, detail: detail ?? null }, { onConflict: 'channel,address', ignoreDuplicates: true }))
  }
  async unsuppress(channel: Channel, address: string, onlyReasons?: SuppressionReason[]) {
    let q = this.db.from('suppressions').delete().eq('channel', channel).eq('address', address)
    if (onlyReasons?.length) q = q.in('reason', onlyReasons)
    must(await q)
  }

  async insertMessages(rows: NewMessage[]) {
    const out: Message[] = []
    for (let i = 0; i < rows.length; i += 500) {
      out.push(...(must(await this.db.from('messages').insert(rows.slice(i, i + 500)).select()) as Message[]))
    }
    return out
  }
  async findMessageByProviderId(channel: Channel, providerId: string) {
    return must(await this.db.from('messages').select('*').eq('channel', channel).eq('provider_message_id', providerId).maybeSingle()) as Message | null
  }
  async updateMessage(id: string, patch: Partial<Message>) {
    must(await this.db.from('messages').update(patch).eq('id', id))
  }
  async queuedForSending(channel: Channel, limit: number) {
    const campaigns = await this.sendingCampaigns(channel)
    if (!campaigns.length || limit <= 0) return []
    return must(await this.db.from('messages').select('*')
      .eq('channel', channel).eq('status', 'queued').in('campaign_id', campaigns.map(c => c.id))
      .order('created_at').limit(limit)) as Message[]
  }
  async countQueued(campaignId: string) {
    const { count, error } = await this.db.from('messages').select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId).eq('status', 'queued')
    if (error) throw new Error(error.message)
    return count ?? 0
  }
  async sentVolumeSince(channel: Channel, sinceIso: string) {
    if (channel === 'email') {
      const { count, error } = await this.db.from('messages').select('id', { count: 'exact', head: true })
        .eq('channel', 'email').eq('direction', 'outbound').gte('sent_at', sinceIso)
      if (error) throw new Error(error.message)
      return count ?? 0
    }
    return must(await this.db.rpc('whatsapp_unique_recipients_since', { since: sinceIso })) as number
  }
  async firstSendAt(channel: Channel) {
    const rows = must(await this.db.from('messages').select('sent_at')
      .eq('channel', channel).eq('direction', 'outbound').not('sent_at', 'is', null)
      .order('sent_at').limit(1)) as Array<{ sent_at: string }>
    return rows[0]?.sent_at ?? null
  }
  async health(channel: Channel) {
    return must(await this.db.from('v_channel_health_7d').select('*').eq('channel', channel).maybeSingle()) as ChannelHealth | null
  }
  async lastInboundRef(contactId: string, channel: Channel) {
    const rows = must(await this.db.from('messages').select('subject, external_ref')
      .eq('contact_id', contactId).eq('channel', channel).eq('direction', 'inbound')
      .order('created_at', { ascending: false }).limit(1)) as Array<{ subject: string | null; external_ref: string | null }>
    return rows[0] ?? null
  }

  async getCampaign(id: string) {
    return must(await this.db.from('campaigns').select('*').eq('id', id).maybeSingle()) as Campaign | null
  }
  async getCampaigns(ids: string[]) {
    if (!ids.length) return []
    return must(await this.db.from('campaigns').select('*').in('id', ids)) as Campaign[]
  }
  async sendingCampaigns(channel: Channel) {
    return must(await this.db.from('campaigns').select('*').eq('channel', channel).eq('status', 'sending')) as Campaign[]
  }
  async updateCampaign(id: string, patch: Partial<Campaign>) {
    must(await this.db.from('campaigns').update(patch).eq('id', id))
  }

  async getSetting(key: string) {
    const row = must(await this.db.from('site_settings').select('value').eq('key', key).maybeSingle()) as { value: string | null } | null
    return row?.value ?? null
  }
}

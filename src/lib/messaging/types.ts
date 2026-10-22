export type Channel = 'email' | 'whatsapp'
export type MessageCategory = 'marketing' | 'utility'
export type EmailConsent = 'opted_in' | 'implied' | 'unknown' | 'opted_out'
export type WhatsAppConsent = 'opted_in' | 'unknown' | 'opted_out'
export type SuppressionReason =
  'unsubscribed' | 'hard_bounce' | 'complaint' | 'stop_keyword' | 'manual' | 'invalid' | 'marketing_blocked'
export type CampaignStatus = 'draft' | 'sending' | 'paused' | 'completed' | 'cancelled'
export type MessageStatus =
  'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'complained' | 'skipped' | 'received'

export interface AudienceContact {
  id: string
  name: string | null
  company: string | null
  email: string | null
  phone: string | null
  contact_type: 'client' | 'b2b' | 'lead' | 'other'
  source: 'lead_form' | 'import' | 'manual' | 'inbound'
  lead_id: string | null
  tags: string[]
  email_consent: EmailConsent
  email_consent_at: string | null
  email_consent_source: string | null
  whatsapp_consent: WhatsAppConsent
  whatsapp_consent_at: string | null
  whatsapp_consent_source: string | null
  last_inbound_whatsapp_at: string | null
  last_inbound_email_at: string | null
  unsubscribe_token: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  name: string
  channel: Channel
  category: MessageCategory
  status: CampaignStatus
  pause_reason: string | null
  audience_filter: { tags?: string[]; contact_types?: string[] }
  email_subject: string | null
  email_html: string | null
  email_text: string | null
  wa_template_name: string | null
  wa_template_lang: string | null
  wa_template_params: string[]
  total_recipients: number
  skipped_count: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface Message {
  id: string
  campaign_id: string | null
  contact_id: string | null
  channel: Channel
  direction: 'outbound' | 'inbound'
  category: MessageCategory
  to_address: string
  from_address: string | null
  subject: string | null
  body: string | null
  template_name: string | null
  status: MessageStatus
  error: string | null
  provider_message_id: string | null
  external_ref: string | null
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
}

export interface Suppression {
  id: string
  channel: Channel
  address: string
  reason: SuppressionReason
  detail: string | null
  created_at: string
}

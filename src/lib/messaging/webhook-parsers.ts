// Pure parsers that turn provider webhook payloads into normalized events.

export type NormalizedEvent =
  | { kind: 'inbound'; channel: 'email' | 'whatsapp'; providerId: string; from: string; fromName?: string; subject?: string; body: string | null; at: string; emailId?: string; messageIdHeader?: string }
  | { kind: 'status'; channel: 'email' | 'whatsapp'; providerId: string; status: 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'complained'; at: string; error?: string; errorCode?: number; permanent?: boolean; recipient?: string }
  | { kind: 'quality'; channel: 'whatsapp'; event: string; currentLimit?: string }

// ── WhatsApp Cloud API ──────────────────────────────────────────────────────

interface WAWebhook {
  object?: string
  entry?: Array<{ changes?: Array<{ field?: string; value?: WAValue }> }>
}
interface WAValue {
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
  messages?: Array<{
    id: string; from: string; timestamp: string; type: string
    text?: { body?: string }
    button?: { text?: string; payload?: string }
    interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
    image?: { caption?: string }; document?: { caption?: string; filename?: string }
  }>
  statuses?: Array<{
    id: string; status: string; timestamp: string; recipient_id?: string
    errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>
  }>
  event?: string
  current_limit?: string
}

const tsToIso = (ts: string) => new Date(Number(ts) * 1000).toISOString()

/** Meta error codes meaning "don't retry to this user" for marketing. */
export const WA_PERMANENT_ERRORS = new Set([
  131026, // message undeliverable (not on WhatsApp / old app)
  131050, // user has stopped marketing messages from this business
])

export function parseWhatsAppWebhook(payload: unknown): NormalizedEvent[] {
  const p = payload as WAWebhook
  if (p?.object !== 'whatsapp_business_account') return []
  const out: NormalizedEvent[] = []

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value
      if (!v) continue

      if (change.field === 'phone_number_quality_update') {
        out.push({ kind: 'quality', channel: 'whatsapp', event: v.event ?? 'UNKNOWN', currentLimit: v.current_limit })
        continue
      }
      if (change.field !== 'messages') continue

      const names = new Map((v.contacts ?? []).map(c => [c.wa_id, c.profile?.name]))
      for (const m of v.messages ?? []) {
        const body =
          m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ??
          m.image?.caption ?? m.document?.caption ?? (m.type !== 'text' ? `[${m.type}]` : null)
        out.push({ kind: 'inbound', channel: 'whatsapp', providerId: m.id, from: m.from, fromName: names.get(m.from) ?? undefined, body, at: tsToIso(m.timestamp) })
      }
      for (const s of v.statuses ?? []) {
        if (!['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue
        const err = s.errors?.[0]
        out.push({
          kind: 'status', channel: 'whatsapp', providerId: s.id, status: s.status as 'sent' | 'delivered' | 'read' | 'failed',
          at: tsToIso(s.timestamp), recipient: s.recipient_id,
          error: err ? `${err.code}: ${err.title ?? err.message ?? ''}${err.error_data?.details ? ` — ${err.error_data.details}` : ''}` : undefined,
          errorCode: err?.code,
          permanent: err?.code !== undefined && WA_PERMANENT_ERRORS.has(err.code),
        })
      }
    }
  }
  return out
}

// ── Resend ──────────────────────────────────────────────────────────────────

interface ResendWebhook {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    from?: string
    to?: string[]
    subject?: string
    message_id?: string
    bounce?: { type?: string; subType?: string; message?: string }
  }
}

/** Extracts "jane@x.com" from "Jane Doe <jane@x.com>". */
export function parseAddress(raw: string | undefined): { email: string; name?: string } {
  const s = (raw ?? '').trim()
  const m = s.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/)
  if (m) return { email: m[2].trim().toLowerCase(), name: m[1].trim() || undefined }
  return { email: s.toLowerCase() }
}

export function parseResendWebhook(payload: unknown): NormalizedEvent[] {
  const p = payload as ResendWebhook
  const d = p?.data
  if (!p?.type || !d?.email_id) return []
  const at = p.created_at ?? new Date().toISOString()

  switch (p.type) {
    case 'email.received': {
      const from = parseAddress(d.from)
      return [{ kind: 'inbound', channel: 'email', providerId: d.email_id, emailId: d.email_id, from: from.email, fromName: from.name, subject: d.subject, body: null, at, messageIdHeader: d.message_id }]
    }
    case 'email.sent':
    case 'email.delivered':
      return [{ kind: 'status', channel: 'email', providerId: d.email_id, status: p.type === 'email.sent' ? 'sent' : 'delivered', at }]
    case 'email.opened':
      return [{ kind: 'status', channel: 'email', providerId: d.email_id, status: 'read', at }]
    case 'email.bounced': {
      const permanent = (d.bounce?.type ?? 'Permanent').toLowerCase() === 'permanent'
      return [{ kind: 'status', channel: 'email', providerId: d.email_id, status: permanent ? 'bounced' : 'failed', permanent, at, error: d.bounce?.message ?? d.bounce?.subType, recipient: d.to?.[0]?.toLowerCase() }]
    }
    case 'email.complained':
      return [{ kind: 'status', channel: 'email', providerId: d.email_id, status: 'complained', permanent: true, at, recipient: d.to?.[0]?.toLowerCase() }]
    case 'email.failed':
      return [{ kind: 'status', channel: 'email', providerId: d.email_id, status: 'failed', at, recipient: d.to?.[0]?.toLowerCase() }]
    default:
      return []
  }
}

/** Strips quoted history from an email reply so the inbox shows just the new text. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (const line of lines) {
    if (/^On .+wrote:\s*$/.test(line) || /^-{2,}\s*Original Message/i.test(line) || /^From:\s/.test(line) || /^في .+كتب:/.test(line)) break
    if (line.startsWith('>')) continue
    out.push(line)
  }
  return out.join('\n').trim()
}

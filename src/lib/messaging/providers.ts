import type { MessagingConfig } from './config'

export interface SendResult { ok: boolean; providerId?: string; error?: string }

export interface OutboundEmail {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

function dryId(prefix: string) {
  return `dryrun_${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

// ── Email (Resend) ──────────────────────────────────────────────────────────

/** Sends up to 100 emails in one Resend batch call. Results are index-aligned with input. */
export async function sendEmailBatch(cfg: MessagingConfig, emails: OutboundEmail[], idempotencyKey: string): Promise<SendResult[]> {
  if (emails.length === 0) return []
  if (cfg.dryRun || !cfg.email.configured) {
    return emails.map(() => ({ ok: true, providerId: dryId('email') }))
  }

  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.email.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(emails.map(e => ({
      from: cfg.email.from,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      reply_to: cfg.email.replyTo,
      headers: e.headers,
      tags: e.tags,
    }))),
  })

  if (!res.ok) {
    const err = `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`
    return emails.map(() => ({ ok: false, error: err }))
  }
  const json = await res.json() as { data?: Array<{ id: string }> }
  return emails.map((_, i) => {
    const id = json.data?.[i]?.id
    return id ? { ok: true, providerId: id } : { ok: false, error: 'No id returned by Resend' }
  })
}

export async function sendSingleEmail(cfg: MessagingConfig, email: OutboundEmail & { inReplyTo?: string }): Promise<SendResult> {
  if (cfg.dryRun || !cfg.email.configured) return { ok: true, providerId: dryId('email') }
  const headers = { ...(email.headers ?? {}) }
  if (email.inReplyTo) { headers['In-Reply-To'] = email.inReplyTo; headers['References'] = email.inReplyTo }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.email.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: cfg.email.from, to: [email.to], subject: email.subject,
      html: email.html, text: email.text, reply_to: cfg.email.replyTo, headers,
    }),
  })
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` }
  const json = await res.json() as { id?: string }
  return json.id ? { ok: true, providerId: json.id } : { ok: false, error: 'No id returned by Resend' }
}

export interface ReceivedEmail { text: string | null; html: string | null; message_id: string | null; subject: string | null }

export async function fetchReceivedEmail(cfg: MessagingConfig, emailId: string): Promise<ReceivedEmail | null> {
  if (cfg.dryRun || !cfg.email.apiKey) return null
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${cfg.email.apiKey}` },
  })
  if (!res.ok) return null
  return await res.json() as ReceivedEmail
}

// ── WhatsApp Cloud API ──────────────────────────────────────────────────────

async function postWhatsApp(cfg: MessagingConfig, payload: object): Promise<SendResult> {
  if (cfg.dryRun || !cfg.whatsapp.configured) return { ok: true, providerId: dryId('wa') }
  const url = `https://graph.facebook.com/${cfg.whatsapp.graphVersion}/${cfg.whatsapp.phoneNumberId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.whatsapp.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload }),
  })
  const json = await res.json().catch(() => ({})) as {
    messages?: Array<{ id: string }>
    error?: { code?: number; message?: string }
  }
  if (!res.ok || !json.messages?.[0]?.id) {
    const e = json.error
    return { ok: false, error: e ? `WA ${e.code ?? res.status}: ${e.message ?? 'error'}` : `WA HTTP ${res.status}` }
  }
  return { ok: true, providerId: json.messages[0].id }
}

export function sendWhatsAppTemplate(cfg: MessagingConfig, to: string, templateName: string, lang: string, bodyParams: string[]) {
  return postWhatsApp(cfg, {
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map(text => ({ type: 'text', text })) }]
        : undefined,
    },
  })
}

export function sendWhatsAppText(cfg: MessagingConfig, to: string, body: string) {
  return postWhatsApp(cfg, { to, type: 'text', text: { preview_url: false, body } })
}

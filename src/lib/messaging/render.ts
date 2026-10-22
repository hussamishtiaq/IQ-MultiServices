import type { AudienceContact } from './types'

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export type TemplateVars = Record<string, string>

export function contactVars(contact: Pick<AudienceContact, 'name' | 'company' | 'email' | 'phone'>, unsubscribeUrl: string): TemplateVars {
  const name = contact.name?.trim() ?? ''
  return {
    name: name || 'there',
    first_name: name.split(/\s+/)[0] || 'there',
    company: contact.company?.trim() ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    unsubscribe_url: unsubscribeUrl,
  }
}

/** Replaces {{var}} placeholders. In HTML mode, values are escaped. Unknown vars become ''. */
export function renderTemplate(template: string, vars: TemplateVars, mode: 'html' | 'text'): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const v = vars[key.toLowerCase()] ?? ''
    return mode === 'html' && key.toLowerCase() !== 'unsubscribe_url' ? escapeHtml(v) : v
  })
}

export function unsubscribeUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, '')}/unsubscribe?t=${encodeURIComponent(token)}`
}

export function oneClickUnsubscribeUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, '')}/api/unsubscribe?t=${encodeURIComponent(token)}`
}

/**
 * Marketing emails must carry an unsubscribe link and the sender's postal
 * address. If the author's template omits them, append a compliant footer.
 */
export function buildMarketingEmail(opts: {
  subjectTpl: string
  htmlTpl: string
  textTpl: string | null
  vars: TemplateVars
  postalAddress: string
}): { subject: string; html: string; text: string } {
  const { vars, postalAddress } = opts
  const subject = renderTemplate(opts.subjectTpl, vars, 'text')
  let html = renderTemplate(opts.htmlTpl, vars, 'html')
  let text = opts.textTpl ? renderTemplate(opts.textTpl, vars, 'text') : htmlToText(html)

  const hasUnsubHtml = opts.htmlTpl.includes('{{unsubscribe_url}}')
  const hasUnsubText = !!opts.textTpl && opts.textTpl.includes('{{unsubscribe_url}}')

  if (!hasUnsubHtml) {
    html += `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;font-family:sans-serif">
  ${escapeHtml(postalAddress)}<br/>
  You are receiving this because you are in contact with us.
  <a href="${vars.unsubscribe_url}" style="color:#64748b">Unsubscribe</a>
</div>`
  }
  if (!hasUnsubText) text += `\n\n--\n${postalAddress}\nUnsubscribe: ${vars.unsubscribe_url}`

  return { subject, html, text }
}

/** RFC 8058 one-click unsubscribe headers (required by Gmail/Yahoo for bulk mail). */
export function listUnsubscribeHeaders(oneClickUrl: string, mailto?: string): Record<string, string> {
  const parts = [`<${oneClickUrl}>`]
  if (mailto) parts.push(`<mailto:${mailto}?subject=unsubscribe>`)
  return {
    'List-Unsubscribe': parts.join(', '),
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li)\s*\/?>/gi, '\n')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Resolves WhatsApp template body params like "{{name}}" against contact vars. */
export function resolveTemplateParams(params: string[], vars: TemplateVars): string[] {
  return params.map(p => renderTemplate(p, vars, 'text') || '-')
}

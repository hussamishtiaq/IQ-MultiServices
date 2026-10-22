import { describe, expect, it } from 'vitest'
import { buildMarketingEmail, contactVars, listUnsubscribeHeaders, renderTemplate, resolveTemplateParams } from '../render'
import { signMeta, signSvix, verifyMetaSignature, verifySvixSignature } from '../signatures'
import { parseAddress, parseResendWebhook, parseWhatsAppWebhook, stripQuotedReply } from '../webhook-parsers'
import { parseCsv, prepareImport, consentFor } from '../import'

describe('renderTemplate', () => {
  it('escapes HTML in values to prevent injection via contact names', () => {
    expect(renderTemplate('<p>Hi {{name}}</p>', { name: '<script>x</script>' }, 'html')).toBe('<p>Hi &lt;script&gt;x&lt;/script&gt;</p>')
  })
  it('leaves text mode unescaped and blanks unknown vars', () => {
    expect(renderTemplate('Hi {{ first_name }} {{nope}}', { first_name: 'Ali' }, 'text')).toBe('Hi Ali ')
  })
  it('falls back to "there" when name missing', () => {
    expect(contactVars({ name: null, company: null, email: null, phone: null }, 'u').first_name).toBe('there')
  })
})

describe('buildMarketingEmail', () => {
  const vars = { name: 'Sara Khan', first_name: 'Sara', company: '', email: '', phone: '', unsubscribe_url: 'https://x.com/unsubscribe?t=abc' }
  it('auto-appends unsubscribe link and postal address when template omits them', () => {
    const out = buildMarketingEmail({ subjectTpl: 'Hi {{first_name}}', htmlTpl: '<p>New villas</p>', textTpl: null, vars, postalAddress: 'Dubai, UAE' })
    expect(out.subject).toBe('Hi Sara')
    expect(out.html).toContain('https://x.com/unsubscribe?t=abc')
    expect(out.html).toContain('Dubai, UAE')
    expect(out.text).toContain('Unsubscribe: https://x.com/unsubscribe?t=abc')
  })
  it('does not double-append when template already has {{unsubscribe_url}}', () => {
    const out = buildMarketingEmail({ subjectTpl: 's', htmlTpl: '<a href="{{unsubscribe_url}}">leave</a>', textTpl: 'bye {{unsubscribe_url}}', vars, postalAddress: 'Dubai' })
    expect(out.html.match(/unsubscribe\?t=abc/g)).toHaveLength(1)
    expect(out.text).toBe('bye https://x.com/unsubscribe?t=abc')
  })
  it('produces RFC 8058 one-click headers', () => {
    const h = listUnsubscribeHeaders('https://x.com/api/unsubscribe?t=abc', 'unsub@x.com')
    expect(h['List-Unsubscribe']).toBe('<https://x.com/api/unsubscribe?t=abc>, <mailto:unsub@x.com?subject=unsubscribe>')
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
  it('resolves WhatsApp template params with a non-empty fallback', () => {
    expect(resolveTemplateParams(['{{first_name}}', '{{company}}'], vars)).toEqual(['Sara', '-'])
  })
})

describe('webhook signatures', () => {
  const secret = 'whsec_' + Buffer.from('supersecretkey123').toString('base64')
  const body = '{"type":"email.delivered"}'
  const now = new Date('2026-10-22T12:00:00Z')
  const ts = String(Math.floor(now.getTime() / 1000))

  it('accepts a valid Svix (Resend) signature', () => {
    const sig = signSvix(secret, 'msg_1', ts, body)
    expect(verifySvixSignature({ secret, id: 'msg_1', timestamp: ts, signatureHeader: `v1,bogus ${sig}`, body, now })).toBe(true)
  })
  it('rejects tampered body, wrong secret, and stale timestamps', () => {
    const sig = signSvix(secret, 'msg_1', ts, body)
    expect(verifySvixSignature({ secret, id: 'msg_1', timestamp: ts, signatureHeader: sig, body: body + ' ', now })).toBe(false)
    expect(verifySvixSignature({ secret: 'whsec_' + Buffer.from('other').toString('base64'), id: 'msg_1', timestamp: ts, signatureHeader: sig, body, now })).toBe(false)
    const old = new Date(now.getTime() + 10 * 60_000)
    expect(verifySvixSignature({ secret, id: 'msg_1', timestamp: ts, signatureHeader: sig, body, now: old })).toBe(false)
  })
  it('verifies Meta X-Hub-Signature-256', () => {
    expect(verifyMetaSignature('appsecret', signMeta('appsecret', body), body)).toBe(true)
    expect(verifyMetaSignature('appsecret', signMeta('wrong', body), body)).toBe(false)
    expect(verifyMetaSignature('appsecret', null, body)).toBe(false)
  })
})

describe('parseWhatsAppWebhook', () => {
  const wrap = (field: string, value: object) => ({ object: 'whatsapp_business_account', entry: [{ id: '1', changes: [{ field, value }] }] })

  it('parses inbound text with sender name', () => {
    const ev = parseWhatsAppWebhook(wrap('messages', {
      contacts: [{ wa_id: '971501234567', profile: { name: 'Omar' } }],
      messages: [{ id: 'wamid.1', from: '971501234567', timestamp: '1761134400', type: 'text', text: { body: 'Is the villa available?' } }],
    }))
    expect(ev).toEqual([{ kind: 'inbound', channel: 'whatsapp', providerId: 'wamid.1', from: '971501234567', fromName: 'Omar', body: 'Is the villa available?', at: new Date(1761134400000).toISOString() }])
  })
  it('parses template quick-reply buttons as text', () => {
    const [ev] = parseWhatsAppWebhook(wrap('messages', { messages: [{ id: 'w2', from: '1', timestamp: '1', type: 'button', button: { text: 'Stop promotions' } }] }))
    expect(ev).toMatchObject({ kind: 'inbound', body: 'Stop promotions' })
  })
  it('parses statuses and flags permanent marketing-stop errors', () => {
    const ev = parseWhatsAppWebhook(wrap('messages', {
      statuses: [
        { id: 'w3', status: 'delivered', timestamp: '1761134400', recipient_id: '971501234567' },
        { id: 'w4', status: 'failed', timestamp: '1761134400', recipient_id: '971501234567', errors: [{ code: 131050, title: 'User stopped marketing' }] },
      ],
    }))
    expect(ev[0]).toMatchObject({ kind: 'status', status: 'delivered', permanent: false })
    expect(ev[1]).toMatchObject({ kind: 'status', status: 'failed', errorCode: 131050, permanent: true })
  })
  it('parses quality updates and ignores foreign payloads', () => {
    expect(parseWhatsAppWebhook(wrap('phone_number_quality_update', { event: 'FLAGGED', current_limit: 'TIER_250' })))
      .toEqual([{ kind: 'quality', channel: 'whatsapp', event: 'FLAGGED', currentLimit: 'TIER_250' }])
    expect(parseWhatsAppWebhook({ object: 'page' })).toEqual([])
  })
})

describe('parseResendWebhook', () => {
  it('parses received email with display name', () => {
    const [ev] = parseResendWebhook({ type: 'email.received', created_at: '2026-10-22T10:00:00Z', data: { email_id: 'e1', from: 'Jane Doe <Jane@Corp.com>', to: ['hello@iq.ae'], subject: 'Re: Marina offer', message_id: '<m1@corp>' } })
    expect(ev).toMatchObject({ kind: 'inbound', channel: 'email', from: 'jane@corp.com', fromName: 'Jane Doe', subject: 'Re: Marina offer', messageIdHeader: '<m1@corp>' })
  })
  it('distinguishes hard vs soft bounces', () => {
    expect(parseResendWebhook({ type: 'email.bounced', data: { email_id: 'e', to: ['x@y.com'], bounce: { type: 'Permanent' } } })[0])
      .toMatchObject({ status: 'bounced', permanent: true, recipient: 'x@y.com' })
    expect(parseResendWebhook({ type: 'email.bounced', data: { email_id: 'e', to: ['x@y.com'], bounce: { type: 'Transient' } } })[0])
      .toMatchObject({ status: 'failed', permanent: false })
  })
  it('parses complaints', () => {
    expect(parseResendWebhook({ type: 'email.complained', data: { email_id: 'e', to: ['X@Y.com'] } })[0])
      .toMatchObject({ status: 'complained', permanent: true, recipient: 'x@y.com' })
  })
  it('parseAddress handles bare and named addresses', () => {
    expect(parseAddress('a@b.com')).toEqual({ email: 'a@b.com' })
    expect(parseAddress('"Ali K" <ALI@b.com>')).toEqual({ email: 'ali@b.com', name: 'Ali K' })
  })
  it('stripQuotedReply removes quoted history', () => {
    expect(stripQuotedReply('Yes please send details\n\nOn Tue, Oct 21, 2026 at 10:00 IQ wrote:\n> Hi Jane')).toBe('Yes please send details')
  })
})

describe('CSV import preparation', () => {
  it('parses quoted CSV with commas and escaped quotes', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']])
  })
  it('normalizes, dedupes and reports invalid rows', () => {
    const { rows, invalid } = prepareImport('Name,Email,Phone,Tags,Type\nAli,ALI@x.com,050 123 4567,vip;marina,b2b\nDup,ali@x.com,,,\nNobody,,,,\nSam,,+971 55 000 1111,,client\n')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ name: 'Ali', email: 'ali@x.com', phone: '971501234567', tags: ['vip', 'marina'], contact_type: 'b2b' })
    expect(invalid).toEqual([{ line: 3, reason: 'duplicate in file' }, { line: 4, reason: 'no valid email or phone' }])
  })
  it('rejects files with no email/phone column', () => {
    expect(prepareImport('name,company\nA,B').invalid[0].reason).toMatch(/email.*phone/)
  })
  it('maps consent basis honestly — existing relationship never grants WhatsApp marketing', () => {
    const now = new Date()
    expect(consentFor('none', '', now)).toEqual({})
    expect(consentFor('existing_relationship', 'past clients', now)).toMatchObject({ email_consent: 'implied' })
    expect(consentFor('existing_relationship', '', now).whatsapp_consent).toBeUndefined()
    expect(consentFor('documented_opt_in', 'signup sheet', now)).toMatchObject({ email_consent: 'opted_in', whatsapp_consent: 'opted_in' })
  })
})

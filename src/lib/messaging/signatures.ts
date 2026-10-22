import { createHmac, timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body",
 * key = base64-decoded secret after the "whsec_" prefix.
 */
export function verifySvixSignature(opts: {
  secret: string
  id: string | null
  timestamp: string | null
  signatureHeader: string | null
  body: string
  now?: Date
  toleranceSec?: number
}): boolean {
  const { secret, id, timestamp, signatureHeader, body } = opts
  if (!secret || !id || !timestamp || !signatureHeader) return false

  const ts = Number(timestamp)
  const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000)
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > (opts.toleranceSec ?? 300)) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')

  return signatureHeader.split(' ').some(part => {
    const [version, sig] = part.split(',')
    return version === 'v1' && !!sig && safeEqual(sig, expected)
  })
}

export function signSvix(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  return 'v1,' + createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
}

/** Meta signs WhatsApp webhooks with X-Hub-Signature-256: "sha256=<hex HMAC of raw body with app secret>". */
export function verifyMetaSignature(appSecret: string, signatureHeader: string | null, body: string): boolean {
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) return false
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex')
  return safeEqual(signatureHeader, expected)
}

export function signMeta(appSecret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex')
}

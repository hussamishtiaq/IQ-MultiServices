import { NextRequest, NextResponse } from 'next/server'
import { messagingConfig } from '@/lib/messaging/config'
import { adminStore } from '@/lib/messaging/server'
import { applyEvents } from '@/lib/messaging/service'
import { verifySvixSignature } from '@/lib/messaging/signatures'
import { parseResendWebhook } from '@/lib/messaging/webhook-parsers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const cfg = messagingConfig()
  const raw = await request.text()
  const ok = verifySvixSignature({
    secret: cfg.email.webhookSecret,
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    signatureHeader: request.headers.get('svix-signature'),
    body: raw,
  })
  if (!ok) return new NextResponse('Invalid signature', { status: 401 })

  let payload: unknown
  try { payload = JSON.parse(raw) } catch { return new NextResponse('Bad JSON', { status: 400 }) }

  const events = parseResendWebhook(payload)
  if (!events.length) return NextResponse.json({ ok: true })
  try {
    await applyEvents(adminStore(), cfg, events)
  } catch (e) {
    console.error('[resend webhook]', e)
    return new NextResponse('Processing error', { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

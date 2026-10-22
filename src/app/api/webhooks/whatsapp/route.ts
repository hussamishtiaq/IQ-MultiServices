import { NextRequest, NextResponse } from 'next/server'
import { messagingConfig } from '@/lib/messaging/config'
import { adminStore } from '@/lib/messaging/server'
import { applyEvents } from '@/lib/messaging/service'
import { verifyMetaSignature } from '@/lib/messaging/signatures'
import { parseWhatsAppWebhook } from '@/lib/messaging/webhook-parsers'

export const dynamic = 'force-dynamic'

// Meta calls GET once when you register the webhook URL.
export async function GET(request: NextRequest) {
  const cfg = messagingConfig()
  const p = request.nextUrl.searchParams
  if (p.get('hub.mode') === 'subscribe' && cfg.whatsapp.verifyToken && p.get('hub.verify_token') === cfg.whatsapp.verifyToken) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const cfg = messagingConfig()
  const raw = await request.text()
  if (!verifyMetaSignature(cfg.whatsapp.appSecret, request.headers.get('x-hub-signature-256'), raw)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  let payload: unknown
  try { payload = JSON.parse(raw) } catch { return new NextResponse('Bad JSON', { status: 400 }) }

  const events = parseWhatsAppWebhook(payload)
  if (!events.length) return NextResponse.json({ ok: true })
  try {
    await applyEvents(adminStore(), cfg, events)
  } catch (e) {
    console.error('[whatsapp webhook]', e)
    // Non-2xx makes Meta retry, which is what we want for transient DB errors.
    return new NextResponse('Processing error', { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

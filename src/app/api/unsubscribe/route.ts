import { NextRequest, NextResponse } from 'next/server'
import { adminStore } from '@/lib/messaging/server'
import { unsubscribeByToken } from '@/lib/messaging/service'
import type { Channel } from '@/lib/messaging/types'

export const dynamic = 'force-dynamic'

/**
 * POST = RFC 8058 one-click unsubscribe (Gmail/Yahoo "Unsubscribe" button) and
 * the confirm button on /unsubscribe. GET never unsubscribes, because email
 * security scanners prefetch links — it just shows the confirmation page.
 */
export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t') ?? ''
  return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(t)}`, request.url), 303)
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t') ?? ''
  let channels: Channel[] = ['email']
  let fromForm = false

  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData()
    fromForm = form.get('source') === 'page'
    if (form.get('scope') === 'all') channels = ['email', 'whatsapp']
  }

  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
  const contact = await unsubscribeByToken(adminStore(), token, channels).catch(() => null)

  if (fromForm) {
    return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(token)}&done=${contact ? '1' : '0'}`, request.url), 303)
  }
  return NextResponse.json({ ok: !!contact })
}

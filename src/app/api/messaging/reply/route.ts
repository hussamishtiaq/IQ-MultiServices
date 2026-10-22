import { NextRequest, NextResponse } from 'next/server'
import { messagingConfig } from '@/lib/messaging/config'
import { adminStore, errorResponse, requireAdmin } from '@/lib/messaging/server'
import { sendReply } from '@/lib/messaging/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const body = await request.json().catch(() => null) as { contactId?: string; channel?: string; body?: string; subject?: string } | null
  if (!body?.contactId || (body.channel !== 'email' && body.channel !== 'whatsapp') || typeof body.body !== 'string') {
    return NextResponse.json({ error: 'contactId, channel and body are required' }, { status: 400 })
  }
  try {
    const msg = await sendReply(adminStore(), messagingConfig(), {
      contactId: body.contactId, channel: body.channel, body: body.body.slice(0, 4096), subject: body.subject,
    })
    return NextResponse.json({ message: msg })
  } catch (e) {
    return errorResponse(e)
  }
}

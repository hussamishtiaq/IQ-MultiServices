import { NextRequest, NextResponse } from 'next/server'
import { messagingConfig } from '@/lib/messaging/config'
import { adminStore, errorResponse, requireAdmin } from '@/lib/messaging/server'
import { dispatchChannel } from '@/lib/messaging/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPropertyAlerts, sendViewingReminders } from '@/lib/sales/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = messagingConfig().cronSecret
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true
  return (await requireAdmin()) === null
}

async function run(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const store = adminStore()
    const cfg = messagingConfig()
    const [email, whatsapp] = await Promise.all([
      dispatchChannel(store, cfg, 'email'),
      dispatchChannel(store, cfg, 'whatsapp'),
    ])
    const db = createAdminClient()
    const [viewingReminders, propertyAlerts] = await Promise.all([
      sendViewingReminders(db, cfg).catch(e => { console.error('[dispatch] reminders', e); return -1 }),
      sendPropertyAlerts(db, cfg).catch(e => { console.error('[dispatch] alerts', e); return -1 }),
    ])
    return NextResponse.json({ email, whatsapp, viewingReminders, propertyAlerts, dryRun: cfg.dryRun || undefined })
  } catch (e) {
    return errorResponse(e, 500)
  }
}

// GET for Vercel Cron (sends Authorization: Bearer CRON_SECRET), POST for the admin "Send next batch" button.
export const GET = run
export const POST = run

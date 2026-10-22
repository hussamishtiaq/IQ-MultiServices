import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminStore, errorResponse, requireAdmin } from '@/lib/messaging/server'
import { launchCampaign } from '@/lib/messaging/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const { action } = await request.json().catch(() => ({})) as { action?: string }
  const store = adminStore()
  const campaign = await store.getCampaign(params.id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  try {
    switch (action) {
      case 'launch':
        return NextResponse.json(await launchCampaign(store, params.id))
      case 'pause':
        if (campaign.status !== 'sending') throw new Error('Only sending campaigns can be paused')
        await store.updateCampaign(params.id, { status: 'paused', pause_reason: 'Paused by admin' })
        return NextResponse.json({ ok: true })
      case 'resume':
        if (campaign.status !== 'paused') throw new Error('Only paused campaigns can be resumed')
        await store.updateCampaign(params.id, { status: 'sending', pause_reason: null })
        return NextResponse.json({ ok: true })
      case 'cancel': {
        if (!['sending', 'paused', 'draft'].includes(campaign.status)) throw new Error(`Cannot cancel a ${campaign.status} campaign`)
        const db = createAdminClient()
        const { error } = await db.from('messages').update({ status: 'skipped', error: 'campaign_cancelled' })
          .eq('campaign_id', params.id).eq('status', 'queued')
        if (error) throw new Error(error.message)
        await store.updateCampaign(params.id, { status: 'cancelled', completed_at: new Date().toISOString() })
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    return errorResponse(e)
  }
}

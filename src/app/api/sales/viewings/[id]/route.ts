import { NextRequest, NextResponse } from 'next/server'
import { messagingConfig } from '@/lib/messaging/config'
import { errorResponse, requireAdmin } from '@/lib/messaging/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateViewingStatus, type Viewing } from '@/lib/sales/server'

export const dynamic = 'force-dynamic'

const STATUSES: Viewing['status'][] = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show']

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAdmin()
  if (unauth) return unauth
  const { status } = await request.json().catch(() => ({})) as { status?: Viewing['status'] }
  if (!status || !STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  try {
    return NextResponse.json({ viewing: await updateViewingStatus(createAdminClient(), messagingConfig(), params.id, status) })
  } catch (e) {
    return errorResponse(e)
  }
}

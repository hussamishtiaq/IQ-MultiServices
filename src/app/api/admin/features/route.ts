import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { FEATURE_PREFIX, FEATURES_CACHE_TAG, isFeatureKey } from '@/lib/site-features'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const rows = Object.entries(body)
    .filter(([k, v]) => isFeatureKey(k) && typeof v === 'boolean')
    .map(([k, v]) => ({ key: FEATURE_PREFIX + k, value: v ? 'on' : 'off' }))
  if (!rows.length) return NextResponse.json({ error: 'No valid features' }, { status: 400 })

  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidateTag(FEATURES_CACHE_TAG)
  return NextResponse.json({ ok: true })
}

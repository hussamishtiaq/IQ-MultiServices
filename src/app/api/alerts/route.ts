import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SearchCriteria } from '@/lib/sales/core'
import { createSavedSearch } from '@/lib/sales/server'
import { isUuid } from '@/lib/slug'

export const dynamic = 'force-dynamic'

const TYPES = ['apartment', 'villa', 'commercial', 'land', 'office']

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => null) as {
    name?: string; email?: string; phone?: string; channel?: string; consent?: boolean; website?: string
    criteria?: Record<string, unknown>
  } | null
  if (!b) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  if (b.website?.trim()) return NextResponse.json({ ok: true }, { status: 201 })
  if (b.channel !== 'email' && b.channel !== 'whatsapp') return NextResponse.json({ error: 'Choose email or WhatsApp' }, { status: 400 })
  if (b.consent !== true) return NextResponse.json({ error: 'Please tick the box to agree to receive alerts' }, { status: 400 })

  const c = b.criteria ?? {}
  const criteria: SearchCriteria = {}
  if (c.listing_type === 'sale' || c.listing_type === 'rent') criteria.listing_type = c.listing_type
  if (typeof c.area_id === 'string' && isUuid(c.area_id)) criteria.area_id = c.area_id
  if (typeof c.type === 'string' && TYPES.includes(c.type)) criteria.type = c.type as SearchCriteria['type']
  if (Number.isFinite(Number(c.min_beds)) && c.min_beds !== null && c.min_beds !== '') criteria.min_beds = Math.max(0, Math.min(10, Number(c.min_beds)))
  if (Number(c.max_price_aed) > 0) criteria.max_price_aed = Math.round(Number(c.max_price_aed))

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  try {
    const res = await createSavedSearch(createAdminClient(), {
      name: (b.name ?? '').trim().slice(0, 120) || null,
      email: (b.email ?? '').trim().slice(0, 200) || null,
      phone: (b.phone ?? '').trim().slice(0, 30) || null,
      channel: b.channel, criteria, ip,
    })
    return NextResponse.json({ ok: true, id: res.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 })
  }
}

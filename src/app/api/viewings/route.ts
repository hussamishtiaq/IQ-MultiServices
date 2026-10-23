import { NextRequest, NextResponse } from 'next/server'
import { messagingConfig } from '@/lib/messaging/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { viewingSlots } from '@/lib/sales/core'
import { bookViewing, bookedSlots } from '@/lib/sales/server'
import { isUuid } from '@/lib/slug'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get('property') ?? ''
  if (!isUuid(propertyId)) return NextResponse.json({ error: 'property is required' }, { status: 400 })
  try {
    const slots = viewingSlots(new Date(), await bookedSlots(createAdminClient(), propertyId))
    return NextResponse.json({ slots })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => null) as {
    property_id?: string; scheduled_at?: string; name?: string; phone?: string; email?: string
    country_code?: string; notes?: string; website?: string
  } | null
  if (!b) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  if (b.website?.trim()) return NextResponse.json({ ok: true }, { status: 201 }) // honeypot

  const name = (b.name ?? '').trim().slice(0, 120)
  const phone = (b.phone ?? '').trim().slice(0, 30)
  if (!isUuid(b.property_id ?? '') || !b.scheduled_at || !name || !phone) {
    return NextResponse.json({ error: 'Property, time, name and phone are required' }, { status: 400 })
  }
  try {
    const { viewing, agent } = await bookViewing(createAdminClient(), messagingConfig(), {
      propertyId: b.property_id!, scheduledAt: b.scheduled_at, name, phone,
      email: (b.email ?? '').trim().slice(0, 200) || null, countryCode: b.country_code ?? '+971',
      notes: (b.notes ?? '').trim().slice(0, 500) || null,
    })
    return NextResponse.json({ ok: true, id: viewing.id, scheduled_at: viewing.scheduled_at, agent: agent?.name ?? null }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Booking failed' }, { status: 409 })
  }
}

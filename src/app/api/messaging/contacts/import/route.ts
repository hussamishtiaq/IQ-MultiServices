import { NextRequest, NextResponse } from 'next/server'
import { importContacts, type ConsentBasis } from '@/lib/messaging/import'
import { adminStore, errorResponse, requireAdmin } from '@/lib/messaging/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASES: ConsentBasis[] = ['none', 'existing_relationship', 'documented_opt_in']
const MAX_BYTES = 2_000_000

export async function POST(request: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const body = await request.json().catch(() => null) as { csv?: string; basis?: string; note?: string; tags?: string[] } | null
  if (!body?.csv || !BASES.includes(body.basis as ConsentBasis)) {
    return NextResponse.json({ error: 'csv and a valid consent basis are required' }, { status: 400 })
  }
  if (body.csv.length > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 413 })
  if (body.basis !== 'none' && !body.note?.trim()) {
    return NextResponse.json({ error: 'Describe where the consent/relationship comes from — it is stored as your legal basis.' }, { status: 400 })
  }
  try {
    const tags = (body.tags ?? []).filter(t => typeof t === 'string' && t.trim()).slice(0, 10)
    return NextResponse.json(await importContacts(adminStore(), body.csv, body.basis as ConsentBasis, body.note ?? '', tags))
  } catch (e) {
    return errorResponse(e, 500)
  }
}

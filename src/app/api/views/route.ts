import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ViewBody {
  property_id: string
  area_id?:    string | null
  fingerprint?: string
  session_id?:  string
}

export async function POST(request: NextRequest) {
  let body: ViewBody
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.property_id) {
    return NextResponse.json({ error: 'property_id required' }, { status: 400 })
  }

  const referrer  = request.headers.get('referer')?.slice(0, 500) ?? null
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null

  // Country from common CDN headers (Vercel sets x-vercel-ip-country, Cloudflare cf-ipcountry)
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    null

  const supabase = createClient()
  const { error } = await supabase.from('property_views').insert({
    property_id: body.property_id,
    area_id:     body.area_id ?? null,
    fingerprint: body.fingerprint?.slice(0, 100) ?? null,
    session_id:  body.session_id?.slice(0, 100)  ?? null,
    referrer,
    user_agent:  userAgent,
    country,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}

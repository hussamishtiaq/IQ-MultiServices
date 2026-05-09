import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 9
const MAX_Q_LENGTH = 80

function sanitizeIlike(q: string): string {
  return q.slice(0, MAX_Q_LENGTH).replace(/[%_\\]/g, '\\$&').trim()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page    = Math.max(1, Math.min(1000, parseInt(searchParams.get('page') ?? '1') || 1))
  const type    = searchParams.get('type')    ?? ''
  const status  = searchParams.get('status')  ?? ''
  const listing    = searchParams.get('listing')     ?? ''   // sale | rent
  const completion = searchParams.get('completion')  ?? ''   // ready | off_plan | resale
  const areaSlug   = searchParams.get('area')        ?? ''
  const beds       = searchParams.get('beds')        ?? ''
  const studioType = searchParams.get('studio_type') ?? ''   // standard|alcove|convertible|loft|micro
  const q          = sanitizeIlike(searchParams.get('q') ?? '')

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = createClient()

  // Resolve area slug → id once (cheap, indexed)
  let areaId: string | null = null
  if (areaSlug) {
    const { data: a } = await supabase.from('areas').select('id').eq('slug', areaSlug).single()
    areaId = a?.id ?? null
    if (!areaId) {
      // Unknown slug → empty result
      return NextResponse.json({ data: [], total: 0, page, hasMore: false })
    }
  }

  // Select only columns needed for PropertyCard — avoids sending description, project_id, etc.
  const CARD_COLS = 'id,title,price,currency,location,bedrooms,bathrooms,area,type,status,images,featured,studio_type,listing_type,rent_period'
  const countMode = page === 1 ? 'exact' : 'estimated'
  let query = supabase
    .from('properties')
    .select(CARD_COLS, { count: countMode })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (type       && type    !== 'all') query = query.eq('type',              type)
  if (status     && status  !== 'all') query = query.eq('status',            status)
  if (listing    && listing !== 'all') query = query.eq('listing_type',      listing)
  if (completion && completion !== 'all') query = query.eq('completion_status', completion)
  if (areaId)    query = query.eq('area_id', areaId)
  if (beds !== '' && !Number.isNaN(parseInt(beds))) query = query.eq('bedrooms', parseInt(beds))
  if (studioType) query = query.eq('studio_type', studioType)
  if (q)          query = query.ilike('title', `%${q}%`)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const hasMore =
    count != null
      ? count > page * PAGE_SIZE
      : rows.length === PAGE_SIZE

  return NextResponse.json({
    data: rows,
    total: count ?? null,
    page,
    hasMore,
  })
}

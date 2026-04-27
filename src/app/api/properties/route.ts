import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 9
const MAX_Q_LENGTH = 80

function sanitizeIlike(q: string): string {
  // Strip wildcards and escape characters that could force full table scans.
  return q.slice(0, MAX_Q_LENGTH).replace(/[%_\\]/g, '\\$&').trim()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page   = Math.max(1, Math.min(1000, parseInt(searchParams.get('page') ?? '1') || 1))
  const type   = searchParams.get('type')   ?? ''
  const status = searchParams.get('status') ?? ''
  const q      = sanitizeIlike(searchParams.get('q') ?? '')

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = createClient()
  // Only run an exact COUNT on page 1; subsequent pages reuse the cached count via React Query.
  const countMode = page === 1 ? 'exact' : 'estimated'
  let query = supabase
    .from('properties')
    .select('*', { count: countMode })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (type   && type   !== 'all') query = query.eq('type',   type)
  if (status && status !== 'all') query = query.eq('status', status)
  if (q)                          query = query.ilike('title', `%${q}%`)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  // hasMore: if we got a full page, assume there's more; rely on count when available.
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

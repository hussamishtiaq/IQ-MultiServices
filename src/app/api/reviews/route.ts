import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ReviewBody {
  target_type:    'property' | 'area' | 'agent'
  target_id:      string
  rating:         number
  title?:         string
  body?:          string
  reviewer_name?: string
  reviewer_email?: string
  website?:       string  // honeypot
}

export async function POST(request: NextRequest) {
  let body: ReviewBody
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (body.website && body.website.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const validTypes = ['property', 'area', 'agent'] as const
  if (!validTypes.includes(body.target_type)) {
    return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 })
  }
  if (!body.target_id) {
    return NextResponse.json({ error: 'target_id required' }, { status: 400 })
  }
  const rating = Math.round(Number(body.rating))
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase.from('reviews').insert({
    target_type:    body.target_type,
    target_id:      body.target_id,
    rating,
    title:          body.title?.slice(0, 120) || null,
    body:           body.body?.slice(0, 2000) || null,
    reviewer_name:  body.reviewer_name?.slice(0, 120) || null,
    reviewer_email: body.reviewer_email?.slice(0, 200) || null,
    status:         'pending',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}

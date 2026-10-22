import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SupabaseMessagingStore } from './store'

export function adminStore() {
  return new SupabaseMessagingStore(createAdminClient())
}

/** Returns a 401 response if the caller is not a logged-in admin, else null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function errorResponse(e: unknown, status = 400) {
  return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status })
}

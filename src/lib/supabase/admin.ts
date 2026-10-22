import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for server-only code paths with no logged-in user
 * (provider webhooks, cron dispatch, public unsubscribe). Bypasses RLS —
 * never import this from a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

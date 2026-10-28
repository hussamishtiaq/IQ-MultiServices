import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_FEATURES, FEATURE_PREFIX, FEATURES_CACHE_TAG, parseFeatures, type SiteFeatures } from './site-features'

// Cookie-less anon client: site_settings is publicly readable, and unstable_cache can't use cookies().
export const getSiteFeatures = unstable_cache(async (): Promise<SiteFeatures> => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data, error } = await db.from('site_settings').select('key, value').like('key', `${FEATURE_PREFIX}%`)
  if (error) {
    console.error('[site-features] load failed, using defaults:', error.message)
    return DEFAULT_FEATURES
  }
  return parseFeatures(data ?? [])
}, ['site-features'], { tags: [FEATURES_CACHE_TAG], revalidate: 60 })

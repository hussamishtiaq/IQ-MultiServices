import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()
  const [propsRes, areasRes] = await Promise.all([
    supabase.from('properties').select('id, slug, created_at').eq('status', 'available'),
    supabase.from('areas').select('slug, created_at'),
  ])

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                 lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/buy`,        lastModified: now, changeFrequency: 'daily',   priority: 0.95 },
    { url: `${SITE_URL}/rent`,       lastModified: now, changeFrequency: 'daily',   priority: 0.95 },
    { url: `${SITE_URL}/off-plan`,   lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${SITE_URL}/properties`, lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${SITE_URL}/areas`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${SITE_URL}/services`,   lastModified: now, changeFrequency: 'monthly', priority: 0.7  },
    { url: `${SITE_URL}/contact`,    lastModified: now, changeFrequency: 'monthly', priority: 0.5  },
  ]

  const areaRoutes: MetadataRoute.Sitemap = (areasRes.data ?? []).flatMap(
    (a: { slug: string; created_at: string }) => {
      const last = new Date(a.created_at)
      return [
        { url: `${SITE_URL}/areas/${a.slug}`,                       lastModified: last, changeFrequency: 'weekly' as const, priority: 0.8 },
        { url: `${SITE_URL}/properties?area=${a.slug}&listing=sale`, lastModified: last, changeFrequency: 'weekly' as const, priority: 0.7 },
        { url: `${SITE_URL}/properties?area=${a.slug}&listing=rent`, lastModified: last, changeFrequency: 'weekly' as const, priority: 0.7 },
      ]
    }
  )

  const propertyRoutes: MetadataRoute.Sitemap = (propsRes.data ?? []).map(
    (p: { id: string; slug: string | null; created_at: string }) => ({
      url: `${SITE_URL}/properties/${p.id}`,
      lastModified: new Date(p.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })
  )

  return [...staticRoutes, ...areaRoutes, ...propertyRoutes]
}

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, MapPin, Building2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Area } from '@/types'

export const metadata: Metadata = {
  title: 'Browse by Area',
  description: 'Explore Dubai communities — from Marina to Downtown, Business Bay to Palm Jumeirah. Find properties in every prime area.',
  alternates: { canonical: '/areas' },
}

export default async function AreasIndexPage() {
  const supabase = createClient()
  const [areasRes, countsRes] = await Promise.all([
    supabase.from('areas').select('*').order('display_order', { ascending: true }),
    supabase.from('properties').select('area_id', { count: 'exact', head: false }),
  ])

  const areas = (areasRes.data as Area[]) ?? []
  const counts = new Map<string, number>()
  for (const row of countsRes.data ?? []) {
    if (row.area_id) counts.set(row.area_id, (counts.get(row.area_id) ?? 0) + 1)
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">Areas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Dubai Communities</h1>
            <p className="mt-2 text-emerald-200 text-lg">
              {areas.length} prime areas — pick your neighbourhood
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="container-main py-10">
          {areas.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Building2 size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-slate-500">No areas configured yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {areas.map(a => {
                const count = counts.get(a.id) ?? 0
                return (
                  <Link
                    key={a.id}
                    href={`/areas/${a.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {a.hero_image ? (
                        <Image
                          src={a.hero_image}
                          alt={`${a.name} — Dubai`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center">
                          <Building2 size={48} className="text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                        <div>
                          <h3 className="text-xl font-bold">{a.name}</h3>
                          <p className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {a.city}
                          </p>
                        </div>
                        <span className="bg-white/20 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-lg">
                          {count} listing{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      {a.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
                          {a.description}
                        </p>
                      )}
                      {(a.avg_price_sale_aed || a.avg_price_rent_aed) && (
                        <div className="grid grid-cols-2 gap-3 mt-auto pt-3 border-t border-slate-100">
                          {a.avg_price_sale_aed && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Avg sale</p>
                              <p className="text-sm font-semibold text-emerald-700">
                                {formatPrice(a.avg_price_sale_aed, 'AED')}
                              </p>
                            </div>
                          )}
                          {a.avg_price_rent_aed && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Avg rent / yr</p>
                              <p className="text-sm font-semibold text-emerald-700">
                                {formatPrice(a.avg_price_rent_aed, 'AED')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

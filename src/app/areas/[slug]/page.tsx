import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, MapPin, Bed, Building2, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PropertyCard from '@/components/PropertyCard'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Area, Property } from '@/types'

const UNIT_TYPES = ['Studio', '1BR', '2BR', '3BR', '4BR', 'Villa'] as const

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase.from('areas').select('name, description').eq('slug', params.slug).single()
  if (!data) return { title: 'Area Not Found' }
  const desc = data.description?.slice(0, 160) ?? `Explore properties for sale and rent in ${data.name}, Dubai.`
  return {
    title: `${data.name} — Properties for Sale & Rent`,
    description: desc,
    alternates: { canonical: `/areas/${params.slug}` },
    openGraph: {
      title: `${data.name} | Dubai Communities`,
      description: desc,
      url: `/areas/${params.slug}`,
    },
  }
}

export default async function AreaDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: area } = await supabase.from('areas').select('*').eq('slug', params.slug).single()
  if (!area) notFound()
  const a = area as Area

  // Featured/recent properties in this area, plus listing-type counts
  const [propsRes, saleCountRes, rentCountRes] = await Promise.all([
    supabase.from('properties').select('*').eq('area_id', a.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('area_id', a.id).eq('listing_type', 'sale'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('area_id', a.id).eq('listing_type', 'rent'),
  ])

  const properties = (propsRes.data as Property[]) ?? []
  const saleCount  = saleCountRes.count ?? 0
  const rentCount  = rentCountRes.count ?? 0

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        {/* Hero */}
        <div className="relative h-[360px] sm:h-[440px] overflow-hidden">
          {a.hero_image ? (
            <Image src={a.hero_image} alt={`${a.name} — Dubai`} fill priority className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

          <div className="relative z-10 container-main h-full flex flex-col justify-end pb-10 text-white">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight size={14} />
              <Link href="/areas" className="hover:text-white">Areas</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">{a.name}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{a.name}</h1>
            <p className="flex items-center gap-1.5 text-emerald-200 mt-2">
              <MapPin size={15} /> {a.city}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-white border-b border-slate-100 shadow-sm">
          <div className="container-main py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-slate-100">
              <div className="text-center px-2">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">For Sale</p>
                <p className="text-2xl font-extrabold text-emerald-800">{saleCount}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">For Rent</p>
                <p className="text-2xl font-extrabold text-emerald-800">{rentCount}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">Avg Sale</p>
                <p className="text-sm sm:text-base font-bold text-slate-700">
                  {a.avg_price_sale_aed ? formatPrice(a.avg_price_sale_aed, 'AED') : '—'}
                </p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">Avg Rent / Yr</p>
                <p className="text-sm sm:text-base font-bold text-slate-700">
                  {a.avg_price_rent_aed ? formatPrice(a.avg_price_rent_aed, 'AED') : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-main py-10 space-y-10">
          {/* Description */}
          {a.description && (
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">About {a.name}</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{a.description}</p>

              {a.amenities.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {a.amenities.map(am => (
                    <span key={am} className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg">
                      {am}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Quick filter chips: Buy / Rent + Unit types */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bed size={16} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Find your unit type</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link
                href={`/properties?area=${a.slug}&listing=sale`}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-emerald-300 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">For Sale</p>
                  <p className="text-base font-semibold text-slate-900 mt-0.5">All Properties</p>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href={`/properties?area=${a.slug}&listing=rent`}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-emerald-300 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">For Rent</p>
                  <p className="text-base font-semibold text-slate-900 mt-0.5">All Properties</p>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </Link>

              {(a.popular_unit_types.length ? a.popular_unit_types : UNIT_TYPES).map(t => {
                // Encode bedroom int from "1BR"/"Studio"/"Villa"
                const beds = t === 'Studio' ? '0' : /^(\d)BR/.exec(t)?.[1]
                const params = new URLSearchParams({ area: a.slug })
                if (beds !== undefined) params.set('beds', beds)
                if (t === 'Villa') params.set('type', 'villa')
                return (
                  <Link
                    key={t}
                    href={`/properties?${params.toString()}`}
                    className="group bg-emerald-50 rounded-2xl border border-emerald-100 p-5 hover:bg-emerald-100 transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">{t === 'Studio' ? '0 Beds' : (beds ? `${beds} Beds` : 'Type')}</p>
                      <p className="text-base font-semibold text-emerald-900 mt-0.5">{t}</p>
                    </div>
                    <ArrowRight size={16} className="text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Latest listings in this area */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Latest in {a.name}</h2>
              <Link href={`/properties?area=${a.slug}`} className="text-sm font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {properties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No listings yet in {a.name}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((p, idx) => <PropertyCard key={p.id} property={p} priority={idx < 3} />)}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

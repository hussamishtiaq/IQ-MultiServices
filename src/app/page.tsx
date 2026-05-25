export const revalidate = 300   // ISR: re-render at most once every 5 minutes

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowDown, Building2, Briefcase, MapPin, Tag, Layers } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PropertyCard from '@/components/PropertyCard'
import ServiceCard from '@/components/ServiceCard'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Property, Service, SiteSettings, Area } from '@/types'

async function getHomeData() {
  const supabase = createClient()
 const ok = async <T,>(p: PromiseLike<any>) => {
  try {
    return await p
  } catch {
    return {
      data: null as T | null,
      count: null,
      error: null,
    }
  }
}

  const [propRes, svcRes, settingsRes, areasRes, countsRes] = await Promise.all([
    ok(supabase.from('properties').select('*').eq('featured', true).order('created_at', { ascending: false }).limit(3)),
    ok(supabase.from('services').select('*').order('order', { ascending: true }).limit(6)),
    ok(supabase.from('site_settings').select('key, value')),
    ok(supabase.from('areas').select('*').order('display_order', { ascending: true }).limit(6)),
    Promise.all([
      ok(supabase.from('properties').select('id', { count: 'exact', head: true })),
      ok(supabase.from('services').select('id',   { count: 'exact', head: true })),
      ok(supabase.from('areas').select('id',      { count: 'exact', head: true })),
    ]),
  ])

  const settings: SiteSettings = {}
  for (const row of settingsRes.data ?? []) settings[row.key] = row.value

  return {
    properties: (propRes.data as Property[]) ?? [],
    services:   (svcRes.data  as Service[])  ?? [],
    areas:      (areasRes.data as Area[])    ?? [],
    settings,
    propCount: countsRes[0].count ?? 0,
    svcCount:  countsRes[1].count ?? 0,
    areaCount: countsRes[2].count ?? 0,
  }
}

export default async function HomePage() {
  const { properties, services, areas, settings, propCount, svcCount, areaCount } = await getHomeData()

  const siteName  = settings['site_name']  ?? 'IQ MultiServices'
  const tagline   = settings['tagline']    ?? 'Your Trusted Partner in Real Estate & Business Services'
  const heroImage = settings['hero_image'] ?? null

  return (
    <>
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        {heroImage ? (
          <>
            <Image src={heroImage} alt="Hero background" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/55" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900">
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            {/* Glow blobs */}
            <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 container-main pt-24 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Pill badge — placeholder for logo */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-8 text-emerald-200 backdrop-blur-sm">
              🏠 Real Estate &amp; Business Services
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              {siteName}
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {tagline}
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/buy" className="btn-accent px-7 py-3.5 text-base shadow-lg">
                <Tag size={16} /> Buy
              </Link>
              <Link href="/rent"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/15 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/25 transition-all text-base backdrop-blur-sm">
                <Tag size={16} /> Rent
              </Link>
              <Link href="/off-plan"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all text-base backdrop-blur-sm">
                <Layers size={16} /> Off-plan
              </Link>
              <Link href="/areas"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all text-base backdrop-blur-sm">
                <MapPin size={16} /> Areas
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce">
          <ArrowDown size={22} />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-slate-100 shadow-sm">
        <div className="container-main py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto sm:divide-x divide-slate-100">
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800">{propCount}+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Properties</div>
            </div>
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800">{areaCount}+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Areas</div>
            </div>
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800">{svcCount}+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Services</div>
            </div>
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800">100%</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Areas ── */}
      {areas.length > 0 && (
        <section className="bg-white py-20 border-b border-slate-100">
          <div className="container-main">
            <div className="text-center mb-12">
              <span className="section-label mb-3">Communities</span>
              <h2 className="section-title">Popular Dubai Areas</h2>
              <p className="section-subtitle mx-auto text-center">
                Explore prime communities across the city
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {areas.map(a => (
                <Link
                  key={a.id}
                  href={`/areas/${a.slug}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {a.hero_image ? (
                    <Image src={a.hero_image} alt={a.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 to-emerald-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-sm font-bold leading-tight line-clamp-2">{a.name}</p>
                    {a.avg_price_sale_aed && (
                      <p className="text-[10px] text-emerald-300 mt-0.5">From {formatPrice(a.avg_price_sale_aed, 'AED')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/areas" className="btn-secondary">
                Explore all areas <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Properties ── */}
      <section className="bg-slate-50 py-20">
        <div className="container-main">
          <div className="text-center mb-12">
            <span className="section-label mb-3">Featured Listings</span>
            <h2 className="section-title">Our Top Properties</h2>
            <p className="section-subtitle mx-auto text-center">
              Handpicked properties to help you find the perfect match
            </p>
          </div>

          {properties.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
              <div className="text-center mt-10">
                <Link href="/properties" className="btn-primary">
                  View All Properties <ArrowRight size={18} />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Building2 size={48} className="mx-auto mb-3 opacity-30" />
              <p>No featured properties yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Services ── */}
      <section className="bg-white py-20">
        <div className="container-main">
          <div className="text-center mb-12">
            <span className="section-label mb-3">What We Offer</span>
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle mx-auto text-center">
              Professional services tailored to your real estate and business needs
            </p>
          </div>

          {services.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(s => <ServiceCard key={s.id} service={s} />)}
              </div>
              <div className="text-center mt-10">
                <Link href="/services" className="btn-secondary">
                  All Services <ArrowRight size={18} />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Briefcase size={48} className="mx-auto mb-3 opacity-30" />
              <p>No services listed yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section className="relative bg-gradient-to-br from-emerald-950 to-emerald-900 py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="container-main text-center relative z-10">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest block mb-4">Get In Touch</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-emerald-200 mb-8 max-w-md mx-auto text-lg">
            Reach out through any of our contact channels and we&apos;ll get back to you promptly.
          </p>
          <Link href="/contact" className="btn-accent px-8 py-4 text-base shadow-lg">
            Contact Us <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}

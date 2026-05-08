import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Building2, Calendar, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Developer, Project, Area } from '@/types'

export const metadata: Metadata = {
  title: 'Off-plan Properties in Dubai',
  description: 'Browse off-plan and pre-launch developments from Emaar, DAMAC, Sobha, Meraas and more — flexible payment plans starting from AED.',
  alternates: { canonical: '/off-plan' },
}

interface ProjectWithRefs extends Project {
  developers: { slug: string; name: string; logo: string | null } | null
  areas:      { slug: string; name: string } | null
}

export default async function OffPlanPage() {
  const supabase = createClient()
  const [devsRes, projsRes] = await Promise.all([
    supabase.from('developers').select('*').order('display_order', { ascending: true }),
    supabase
      .from('projects')
      .select('*, developers(slug, name, logo), areas(slug, name)')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(24),
  ])

  const developers = (devsRes.data as Developer[]) ?? []
  const projects   = (projsRes.data as ProjectWithRefs[]) ?? []

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        {/* Hero */}
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">Off-plan</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Off-plan Properties</h1>
            <p className="mt-2 text-emerald-200 text-lg">
              Pre-launch and under-construction developments with flexible payment plans
            </p>
          </div>
        </div>

        <div className="container-main py-10 space-y-12">
          {/* Developers strip */}
          {developers.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-4">Top developers</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {developers.map(d => (
                  <Link
                    key={d.id}
                    href={`/off-plan/${d.slug}`}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3"
                  >
                    {d.logo ? (
                      <div className="relative w-10 h-10 rounded-lg bg-slate-50 overflow-hidden flex-shrink-0">
                        <Image src={d.logo} alt={d.name} fill className="object-contain p-1" sizes="40px" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 flex-shrink-0">
                        <Building2 size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm line-clamp-1">{d.name}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-700 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              {projects.length > 0 ? `${projects.length} projects` : 'No projects yet'}
            </h2>

            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
                <Building2 size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium text-slate-500">No off-plan projects published yet</p>
                <p className="text-sm mt-1">Check back soon — new launches every week</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => (
                  <Link
                    key={p.id}
                    href={`/off-plan/${p.developers?.slug ?? 'developer'}/${p.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
                      {p.hero_image ? (
                        <Image src={p.hero_image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center">
                          <Building2 size={48} className="text-white/30" />
                        </div>
                      )}
                      {p.payment_plan && (
                        <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                          {p.payment_plan}
                        </span>
                      )}
                      {p.handover_quarter && (
                        <span className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Calendar size={11} /> {p.handover_quarter}
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                        {p.developers?.name ?? '—'}
                      </p>
                      <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-1 mt-0.5">
                        {p.name}
                      </h3>
                      {p.areas && (
                        <p className="text-sm text-slate-500 mt-0.5">{p.areas.name}</p>
                      )}
                      {p.starting_price_aed != null && (
                        <p className="text-sm font-bold text-emerald-700 mt-3">
                          From {formatPrice(p.starting_price_aed, 'AED')}
                        </p>
                      )}
                      {p.unit_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                          {p.unit_types.slice(0, 4).map(t => (
                            <span key={t} className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

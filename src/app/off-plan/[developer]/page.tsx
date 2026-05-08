import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Building2, Calendar } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Developer, Project } from '@/types'

export async function generateMetadata({ params }: { params: { developer: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase.from('developers').select('name, description').eq('slug', params.developer).single()
  if (!data) return { title: 'Developer Not Found' }
  return {
    title: `${data.name} Off-plan Projects`,
    description: data.description ?? `Browse off-plan developments by ${data.name} in Dubai.`,
    alternates: { canonical: `/off-plan/${params.developer}` },
  }
}

interface ProjectWithArea extends Project {
  areas: { slug: string; name: string } | null
}

export default async function DeveloperPage({ params }: { params: { developer: string } }) {
  const supabase = createClient()
  const { data: dev } = await supabase.from('developers').select('*').eq('slug', params.developer).single()
  if (!dev) notFound()
  const developer = dev as Developer

  const { data } = await supabase
    .from('projects')
    .select('*, areas(slug, name)')
    .eq('developer_id', developer.id)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  const projects = (data as ProjectWithArea[]) ?? []

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight size={14} />
              <Link href="/off-plan" className="hover:text-white">Off-plan</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">{developer.name}</span>
            </div>
            <div className="flex items-center gap-4">
              {developer.logo && (
                <div className="relative w-14 h-14 rounded-xl bg-white overflow-hidden flex-shrink-0">
                  <Image src={developer.logo} alt={developer.name} fill className="object-contain p-2" sizes="56px" />
                </div>
              )}
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">{developer.name}</h1>
                <p className="mt-1 text-emerald-200 text-sm">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-main py-10 space-y-8">
          {developer.description && (
            <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <p className="text-slate-600 leading-relaxed">{developer.description}</p>
              {developer.website && (
                <a href={developer.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800 inline-block mt-3">
                  Official website →
                </a>
              )}
            </section>
          )}

          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
              <Building2 size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium text-slate-500">No projects published for {developer.name} yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <Link
                  key={p.id}
                  href={`/off-plan/${developer.slug}/${p.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
                    {p.hero_image ? (
                      <Image src={p.hero_image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width:1024px) 50vw, 33vw" />
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
                      <span className="absolute top-3 right-3 bg-slate-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Calendar size={11} /> {p.handover_quarter}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-lg leading-snug">{p.name}</h3>
                    {p.areas && <p className="text-sm text-slate-500 mt-0.5">{p.areas.name}</p>}
                    {p.starting_price_aed != null && (
                      <p className="text-sm font-bold text-emerald-700 mt-3">From {formatPrice(p.starting_price_aed, 'AED')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

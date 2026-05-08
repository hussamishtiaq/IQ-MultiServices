import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronRight, Building2, Calendar, MapPin, Tag, Download, ArrowLeft, ImageIcon,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LeadForm from '@/components/LeadForm'
import FloatingCTAs from '@/components/FloatingCTAs'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Project, Developer, Area, Contact } from '@/types'

interface ProjectFull extends Project {
  developers: Developer | null
  areas:      Area | null
}

export async function generateMetadata({ params }: { params: { developer: string; project: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('projects')
    .select('name, description, hero_image, starting_price_aed, developers(name)')
    .eq('slug', params.project)
    .single()

  if (!data) return { title: 'Project Not Found' }
  const devData = Array.isArray(data.developers) ? data.developers[0] : data.developers
  const dev = (devData as { name: string } | null)?.name ?? ''
  const desc = data.description?.slice(0, 160) ??
    `${data.name} by ${dev} — off-plan project in Dubai.`
  return {
    title: `${data.name} by ${dev}`,
    description: desc,
    alternates: { canonical: `/off-plan/${params.developer}/${params.project}` },
    openGraph: {
      type: 'article',
      title: data.name,
      description: desc,
      images: data.hero_image ? [data.hero_image] : undefined,
    },
  }
}

export default async function ProjectDetailPage({ params }: { params: { developer: string; project: string } }) {
  const supabase = createClient()
  const [projRes, contactsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*, developers(*), areas(*)')
      .eq('slug', params.project)
      .single(),
    supabase.from('contacts').select('*').order('order', { ascending: true }).limit(3),
  ])

  if (!projRes.data) notFound()
  const project = projRes.data as unknown as ProjectFull
  const contacts = (contactsRes.data as Contact[]) ?? []

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        {/* Hero */}
        <div className="relative h-[360px] sm:h-[440px] overflow-hidden">
          {project.hero_image ? (
            <Image src={project.hero_image} alt={project.name} fill priority className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

          <div className="relative z-10 container-main h-full flex flex-col justify-end pb-10 text-white">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight size={14} />
              <Link href="/off-plan" className="hover:text-white">Off-plan</Link>
              <ChevronRight size={14} />
              {project.developers && (
                <>
                  <Link href={`/off-plan/${project.developers.slug}`} className="hover:text-white">
                    {project.developers.name}
                  </Link>
                  <ChevronRight size={14} />
                </>
              )}
              <span className="text-white font-medium">{project.name}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{project.name}</h1>
            {project.areas && (
              <p className="flex items-center gap-1.5 text-emerald-200 mt-2">
                <MapPin size={15} /> {project.areas.name}
              </p>
            )}
          </div>
        </div>

        <div className="container-main py-8">
          <Link href={`/off-plan/${project.developers?.slug ?? ''}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 mb-6 font-medium">
            <ArrowLeft size={16} /> Back to {project.developers?.name ?? 'developer'}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick facts */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Starting from</p>
                  <p className="text-base font-bold text-emerald-700 mt-1">
                    {project.starting_price_aed != null ? formatPrice(project.starting_price_aed, 'AED') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Handover</p>
                  <p className="text-base font-bold text-slate-700 mt-1 flex items-center gap-1">
                    <Calendar size={13} className="text-emerald-600" />
                    {project.handover_quarter ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Payment plan</p>
                  <p className="text-base font-bold text-slate-700 mt-1">{project.payment_plan ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Status</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1 capitalize">{project.status.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">About this project</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.description}</p>
                </div>
              )}

              {/* Unit types */}
              {project.unit_types.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Tag size={16} className="text-emerald-700" /> Available unit types
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {project.unit_types.map(t => (
                      <span key={t} className="text-sm font-semibold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment plan description */}
              {project.payment_plan_desc && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment plan details</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.payment_plan_desc}</p>
                </div>
              )}

              {/* Amenities */}
              {project.amenities.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {project.amenities.map(am => (
                      <span key={am} className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {am}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {project.gallery.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <ImageIcon size={16} className="text-emerald-700" /> Gallery
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {project.gallery.map((src, i) => (
                      <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                        <Image src={src} alt={`${project.name} — image ${i + 1}`} fill className="object-cover" sizes="(max-width:1024px) 50vw, 33vw" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brochure / masterplan */}
              {(project.brochure_url || project.masterplan_url) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.brochure_url && (
                    <a href={project.brochure_url} target="_blank" rel="noopener noreferrer"
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                        <Download size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Project Brochure</p>
                        <p className="text-xs text-slate-500">Download PDF</p>
                      </div>
                    </a>
                  )}
                  {project.masterplan_url && (
                    <a href={project.masterplan_url} target="_blank" rel="noopener noreferrer"
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Master plan</p>
                        <p className="text-xs text-slate-500">View layout</p>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right — sticky lead form */}
            <div className="space-y-4 lg:sticky lg:top-20 self-start">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-1">Register interest</h3>
                <p className="text-xs text-slate-500 mb-4">Get the brochure, payment plan, and floor plans by WhatsApp.</p>
                <LeadForm
                  projectId={project.id}
                  areaId={project.area_id ?? undefined}
                  source="off_plan_project"
                  defaultMessage={`I'm interested in "${project.name}" by ${project.developers?.name ?? ''}.`}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <FloatingCTAs contacts={contacts} />
      <Footer />
    </>
  )
}

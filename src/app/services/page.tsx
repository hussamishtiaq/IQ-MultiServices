import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ServiceCard from '@/components/ServiceCard'
import { createClient } from '@/lib/supabase/server'
import { Briefcase, ChevronRight } from 'lucide-react'
import type { Service, SiteSettings } from '@/types'

export const metadata = { title: 'Our Services | IQ MultiServices' }

export default async function ServicesPage() {
  const supabase = createClient()
  const [svcRes, settingsRes] = await Promise.all([
    supabase.from('services').select('*').order('order', { ascending: true }),
    supabase.from('site_settings').select('key, value'),
  ])

  const services = (svcRes.data as Service[]) ?? []
  const settings: SiteSettings = {}
  for (const row of settingsRes.data ?? []) settings[row.key] = row.value

  const aboutText = settings['about_text'] ?? ''

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">Services</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Our Services</h1>
            <p className="mt-2 text-emerald-200 text-lg">Everything we offer to help you succeed</p>
          </div>
        </div>

        <div className="container-main py-12">
          {/* About section */}
          {aboutText && (
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-12">
              <h2 className="text-xl font-bold text-slate-900 mb-3">About Us</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{aboutText}</p>
            </div>
          )}

          {/* Services grid */}
          {services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(s => <ServiceCard key={s.id} service={s} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Briefcase size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-slate-500">No services listed yet</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

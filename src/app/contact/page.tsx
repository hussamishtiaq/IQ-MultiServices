import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { safeContactHref } from '@/lib/safe-url'
import { Phone, ChevronRight } from 'lucide-react'
import type { Contact } from '@/types'

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with IQ MultiServices. Reach us via email, phone, WhatsApp, and social media.',
  alternates: { canonical: '/contact' },
}

const PLATFORM_ICONS: Record<string, string> = {
  email:     '✉️',
  whatsapp:  '💬',
  instagram: '📸',
  facebook:  '📘',
  twitter:   '🐦',
  telegram:  '✈️',
  phone:     '📞',
  website:   '🌐',
}

export default async function ContactPage() {
  const supabase = createClient()
  const { data } = await supabase.from('contacts').select('*').order('order', { ascending: true })
  const contacts = (data as Contact[]) ?? []

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
              <span className="text-white font-medium">Contact</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Contact Us</h1>
            <p className="mt-2 text-emerald-200 text-lg">Reach us through any of these channels</p>
          </div>
        </div>

        <div className="container-main py-12">
          {contacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {contacts.map(c => {
                const icon = c.icon || PLATFORM_ICONS[c.platform.toLowerCase()] || '📱'
                const href = safeContactHref(c.platform, c.value)
                if (!href) return null
                const isExternal = !href.startsWith('mailto:') && !href.startsWith('tel:')

                return (
                  <a
                    key={c.id}
                    href={href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="card p-6 hover:shadow-md transition-shadow duration-200 flex items-center gap-4 group"
                  >
                    <div className="text-4xl w-14 h-14 flex items-center justify-center bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 capitalize">{c.label}</p>
                      <p className="text-sm text-emerald-700 truncate mt-0.5">{c.value}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Phone size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-slate-500">No contact information available yet</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Bed, Bath, Maximize2, Star, Tag, Phone } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PropertyGallery from '@/components/PropertyGallery'
import { createClient } from '@/lib/supabase/server'
import { safeContactHref } from '@/lib/safe-url'
import { formatPrice } from '@/lib/format'
import type { Property, Contact } from '@/types'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('properties')
    .select('title, description, location, status, type, price, images')
    .eq('id', params.id)
    .single()

  if (!data) return { title: 'Property Not Found' }

  const title = data.title as string
  const desc =
    (data.description as string | null)?.slice(0, 160) ??
    `${data.type} in ${data.location ?? 'our portfolio'} — ${data.status}.`
  const image = (data.images as string[] | null)?.[0]
  const noindex = data.status === 'sold' || data.status === 'rented'

  return {
    title,
    description: desc,
    alternates: { canonical: `/properties/${params.id}` },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      title,
      description: desc,
      url: `/properties/${params.id}`,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: desc,
      images: image ? [image] : undefined,
    },
  }
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [propRes, contactsRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', params.id).single(),
    supabase.from('contacts').select('*').order('order', { ascending: true }).limit(3),
  ])

  if (!propRes.data) notFound()
  if (contactsRes.error) console.error('contacts query failed:', contactsRes.error)

  const property = propRes.data as Property
  const contacts = (contactsRes.data as Contact[]) ?? []

  const statusClass: Record<Property['status'], string> = {
    available: 'badge-available',
    sold:      'badge-sold',
    rented:    'badge-rented',
  }
  const typeLabels: Record<string, string> = {
    apartment: 'Apartment', villa: 'Villa', commercial: 'Commercial', land: 'Land', office: 'Office',
  }

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: property.title,
    description: property.description ?? undefined,
    image: property.images ?? [],
    ...(property.price != null && {
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: property.currency ?? 'AED',
        availability:
          property.status === 'available'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    }),
    ...(property.location && {
      address: { '@type': 'PostalAddress', addressLocality: property.location },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        <div className="container-main py-8">
          {/* Back */}
          <Link href="/properties"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 mb-6 transition-colors font-medium">
            <ArrowLeft size={16} /> Back to Properties
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — Gallery */}
            <div className="lg:col-span-2 space-y-5">
              <PropertyGallery images={property.images ?? []} title={property.title} />

              {/* About */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">About this property</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {property.description ?? 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Right — Details */}
            <div className="space-y-4">
              {/* Main info card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h1 className="text-xl font-bold text-slate-900 leading-snug">{property.title}</h1>
                  {property.featured && (
                    <span className="flex-shrink-0 flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Star size={10} fill="white" /> Featured
                    </span>
                  )}
                </div>

                {property.price != null && (
                  <p className="text-2xl font-extrabold text-emerald-800 mb-3">
                    {formatPrice(property.price, property.currency)}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={statusClass[property.status]}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <Tag size={10} /> {typeLabels[property.type] ?? property.type}
                  </span>
                </div>

                {property.location && (
                  <div className="flex items-start gap-2 text-slate-600 text-sm mb-4">
                    <MapPin size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                    {property.location}
                  </div>
                )}

                {(property.bedrooms != null || property.bathrooms != null || property.area != null) && (
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    {property.bedrooms != null && (
                      <div className="text-center">
                        <Bed size={18} className="mx-auto text-slate-400 mb-1" />
                        <p className="font-semibold text-slate-900 text-sm">{property.bedrooms}</p>
                        <p className="text-xs text-slate-500">Beds</p>
                      </div>
                    )}
                    {property.bathrooms != null && (
                      <div className="text-center">
                        <Bath size={18} className="mx-auto text-slate-400 mb-1" />
                        <p className="font-semibold text-slate-900 text-sm">{property.bathrooms}</p>
                        <p className="text-xs text-slate-500">Baths</p>
                      </div>
                    )}
                    {property.area != null && (
                      <div className="text-center">
                        <Maximize2 size={18} className="mx-auto text-slate-400 mb-1" />
                        <p className="font-semibold text-slate-900 text-sm">{property.area}</p>
                        <p className="text-xs text-slate-500">m²</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact card */}
              {contacts.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Phone size={16} className="text-emerald-700" /> Interested? Contact Us
                  </h3>
                  <div className="space-y-2.5">
                    {contacts.map(c => {
                      const href = safeContactHref(c.platform, c.value)
                      if (!href) return null
                      const external = !href.startsWith('mailto:') && !href.startsWith('tel:')
                      return (
                        <a
                          key={c.id}
                          href={href}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-emerald-700 transition-colors"
                        >
                          <span className="text-lg">{c.icon ?? '📞'}</span>
                          <div>
                            <span className="font-semibold text-slate-800">{c.label}</span>
                            <span className="text-slate-500 ml-1.5 truncate">{c.value}</span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                  <Link href="/contact" className="btn-primary mt-5 w-full text-sm py-2.5">
                    View all contacts
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

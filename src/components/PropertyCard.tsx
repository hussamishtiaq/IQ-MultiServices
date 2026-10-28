'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Bed, Bath, Maximize2, Star, ArrowRight } from 'lucide-react'
import type { Property } from '@/types'
import { formatPrice } from '@/lib/format'
import { goldenVisaLikely } from '@/lib/purchase-costs'
import { whatsappInquiryText, whatsappLink } from '@/lib/sales/core'
import { FaWhatsapp } from 'react-icons/fa6'
import { useSiteFeatures } from '@/components/SiteFeaturesProvider'

const statusConfig: Record<Property['status'], { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-emerald-500 text-white'  },
  sold:      { label: 'Sold',      className: 'bg-red-500 text-white'      },
  rented:    { label: 'Rented',    className: 'bg-amber-500 text-white'    },
}

const WA_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function PropertyCard({ property: p, priority = false }: { property: Property; priority?: boolean }) {
  const status = statusConfig[p.status] ?? statusConfig.available
  const features = useSiteFeatures()
  const altText = [p.title, p.type, p.location].filter(Boolean).join(' — ')

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
        {p.images?.[0] ? (
          <Image
            src={p.images[0]}
            alt={altText}
            fill
            priority={priority}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <span className="text-6xl opacity-20">🏠</span>
          </div>
        )}

        {/* Status badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${status.className}`}>
          {status.label}
        </span>

        {/* Featured badge */}
        {p.featured && (
          <span className="absolute top-3 right-3 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-md">
            <Star size={13} className="text-white" fill="currentColor" />
          </span>
        )}

        {features.golden_visa_badge && goldenVisaLikely(p) && (
          <span className="absolute bottom-3 right-3 bg-yellow-400 text-yellow-950 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide shadow">
            Golden Visa
          </span>
        )}

        {/* Price overlay */}
        {p.price != null && (
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-bold">
            {formatPrice(p.price, p.currency)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-1 mb-1.5">
          {p.title}
        </h3>

        {p.location && (
          <p className="flex items-center gap-1.5 text-slate-500 text-sm mb-4">
            <MapPin size={13} className="text-emerald-600 flex-shrink-0" />
            {p.location}
          </p>
        )}

        {/* Stats */}
        {(p.bedrooms != null || p.bathrooms != null || p.area != null) && (
          <div className="flex items-center gap-4 text-slate-500 text-sm pb-4 mb-4 border-b border-slate-100">
            {p.bedrooms != null && (
              <span className="flex items-center gap-1">
                <Bed size={13} className="text-slate-400" />
                {p.bedrooms === 0
                  ? <span>{p.studio_type ? p.studio_type.charAt(0).toUpperCase() + p.studio_type.slice(1) + ' Studio' : 'Studio'}</span>
                  : <span>{p.bedrooms} bd</span>}
              </span>
            )}
            {p.bathrooms != null && <span className="flex items-center gap-1"><Bath      size={13} className="text-slate-400" /> {p.bathrooms} ba</span>}
            {p.area      != null && <span className="flex items-center gap-1"><Maximize2 size={13} className="text-slate-400" /> {p.area} m²</span>}
            <span className="ml-auto capitalize text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{p.type}</span>
          </div>
        )}

        <div className="mt-auto flex gap-2">
        <Link
          href={`/properties/${p.slug ?? p.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-emerald-800 text-emerald-800 font-semibold text-sm hover:bg-emerald-800 hover:text-white transition-all duration-200 group/btn"
        >
          View Details
          <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
        {features.whatsapp_buttons && WA_NUMBER && (
          <a
            href={whatsappLink(WA_NUMBER, whatsappInquiryText(p, SITE_URL))}
            target="_blank" rel="noopener noreferrer"
            aria-label={`Ask about ${p.title} on WhatsApp`} title="Ask on WhatsApp"
            className="flex items-center justify-center w-11 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white transition-colors"
          >
            <FaWhatsapp size={18} />
          </a>
        )}
        </div>
      </div>
    </div>
  )
}

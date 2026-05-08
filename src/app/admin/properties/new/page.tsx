'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Home, Layers, ImageIcon, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ImageUpload from '@/components/admin/ImageUpload'
import { CURRENCY_OPTIONS } from '@/lib/format'
import type { Currency, Area, ListingType, CompletionStatus, Furnishing } from '@/types'

const PROPERTY_TYPES    = ['apartment', 'villa', 'commercial', 'land', 'office'] as const
const PROPERTY_STATUSES = ['available', 'sold', 'rented'] as const
const LISTING_TYPES: ListingType[]       = ['sale', 'rent']
const COMPLETION_STATUSES: CompletionStatus[] = ['ready', 'off_plan', 'resale']
const FURNISHINGS: Furnishing[]          = ['furnished', 'semi_furnished', 'unfurnished']

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-emerald-700" />
        </div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const [areas, setAreas] = useState<Area[]>([])
  const [form, setForm] = useState({
    title:             '',
    description:       '',
    price:             '',
    currency:          'AED' as Currency,
    location:          '',
    area_id:           '',
    listing_type:      'sale' as ListingType,
    completion_status: 'ready' as CompletionStatus,
    furnishing:        '' as '' | Furnishing,
    type:              'apartment' as typeof PROPERTY_TYPES[number],
    bedrooms:          '',
    bathrooms:         '',
    area:              '',
    status:            'available' as typeof PROPERTY_STATUSES[number],
    featured:          false,
  })

  const set = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    const supabase = createClient()
    supabase.from('areas').select('*').order('display_order', { ascending: true })
      .then(({ data }) => setAreas((data as Area[]) ?? []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)

    const supabase = createClient()
    const { error: dbErr } = await supabase.from('properties').insert({
      title:             form.title.trim(),
      description:       form.description.trim() || null,
      price:             form.price     ? parseFloat(form.price)     : null,
      currency:          form.currency,
      location:          form.location.trim()    || null,
      area_id:           form.area_id || null,
      listing_type:      form.listing_type,
      completion_status: form.completion_status,
      furnishing:        form.furnishing || null,
      type:              form.type,
      bedrooms:          form.bedrooms  ? parseInt(form.bedrooms)    : null,
      bathrooms:         form.bathrooms ? parseInt(form.bathrooms)   : null,
      area:              form.area      ? parseFloat(form.area)      : null,
      status:            form.status,
      images,
      featured:          form.featured,
    })

    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    router.push('/admin/properties')
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/properties"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Property</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create a new property listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard icon={Home} title="Basic Information">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="input-field" placeholder="e.g. Modern 3-Bedroom Apartment" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} className="input-field resize-none"
              placeholder="Describe the property…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Price</label>
              <div className="flex gap-2">
                <select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="input-field w-28 flex-shrink-0"
                  aria-label="Currency"
                >
                  {CURRENCY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
                <input type="number" min="0" step="0.01" value={form.price}
                  onChange={e => set('price', e.target.value)}
                  className="input-field flex-1" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className="input-field" placeholder="City, Area" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="Listing & Area">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Listing</label>
              <select value={form.listing_type} onChange={e => set('listing_type', e.target.value)} className="input-field">
                {LISTING_TYPES.map(l => (
                  <option key={l} value={l}>{l === 'sale' ? 'For Sale' : 'For Rent'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Completion</label>
              <select value={form.completion_status} onChange={e => set('completion_status', e.target.value)} className="input-field">
                {COMPLETION_STATUSES.map(c => (
                  <option key={c} value={c}>
                    {c === 'off_plan' ? 'Off-plan' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Furnishing</label>
              <select value={form.furnishing} onChange={e => set('furnishing', e.target.value)} className="input-field">
                <option value="">—</option>
                {FURNISHINGS.map(f => (
                  <option key={f} value={f}>{f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Area / Community</label>
            <select value={form.area_id} onChange={e => set('area_id', e.target.value)} className="input-field">
              <option value="">— Select an area —</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </SectionCard>

        <SectionCard icon={Layers} title="Details">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                {PROPERTY_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                {PROPERTY_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Bedrooms</label>
              <input type="number" min="0" value={form.bedrooms}
                onChange={e => set('bedrooms', e.target.value)}
                className="input-field" placeholder="—" />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input type="number" min="0" value={form.bathrooms}
                onChange={e => set('bathrooms', e.target.value)}
                className="input-field" placeholder="—" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Area (m²)</label>
              <input type="number" min="0" step="0.01" value={form.area}
                onChange={e => set('area', e.target.value)}
                className="input-field" placeholder="—" />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={form.featured}
                  onChange={e => set('featured', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-700" />
                <span className="text-sm font-medium text-slate-700">Mark as Featured</span>
              </label>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={ImageIcon} title="Images">
          <ImageUpload value={images} onChange={setImages} />
        </SectionCard>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="flex items-center gap-3 pb-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Add Property'}
          </button>
          <Link href="/admin/properties" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Home, Layers, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ImageUpload from '@/components/admin/ImageUpload'
import type { Property } from '@/types'

const PROPERTY_TYPES    = ['apartment', 'villa', 'commercial', 'land', 'office'] as const
const PROPERTY_STATUSES = ['available', 'sold', 'rented'] as const

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

export default function EditPropertyPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [images, setImages]   = useState<string[]>([])
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    title:       '',
    description: '',
    price:       '',
    location:    '',
    type:        'apartment' as typeof PROPERTY_TYPES[number],
    bedrooms:    '',
    bathrooms:   '',
    area:        '',
    status:      'available' as typeof PROPERTY_STATUSES[number],
    featured:    false,
  })

  const set = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('properties').select('*').eq('id', id).single()
      if (!data) { setError('Property not found.'); setLoading(false); return }
      const p = data as Property
      setForm({
        title:       p.title,
        description: p.description ?? '',
        price:       p.price != null ? String(p.price) : '',
        location:    p.location ?? '',
        type:        p.type,
        bedrooms:    p.bedrooms  != null ? String(p.bedrooms)  : '',
        bathrooms:   p.bathrooms != null ? String(p.bathrooms) : '',
        area:        p.area      != null ? String(p.area)      : '',
        status:      p.status,
        featured:    p.featured,
      })
      setImages(p.images ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)

    const supabase = createClient()
    const { error: dbErr } = await supabase.from('properties').update({
      title:       form.title.trim(),
      description: form.description.trim() || null,
      price:       form.price     ? parseFloat(form.price)     : null,
      location:    form.location.trim() || null,
      type:        form.type,
      bedrooms:    form.bedrooms  ? parseInt(form.bedrooms)    : null,
      bathrooms:   form.bathrooms ? parseInt(form.bathrooms)   : null,
      area:        form.area      ? parseFloat(form.area)      : null,
      status:      form.status,
      images,
      featured:    form.featured,
    }).eq('id', id)

    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    router.push('/admin/properties')
    router.refresh()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-emerald-600" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/properties"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Property</h1>
          <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{form.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard icon={Home} title="Basic Information">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="input-field" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Price ($)</label>
              <input type="number" min="0" step="0.01" value={form.price}
                onChange={e => set('price', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className="input-field" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Layers} title="Details">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                {PROPERTY_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bedrooms</label>
              <input type="number" min="0" value={form.bedrooms}
                onChange={e => set('bedrooms', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input type="number" min="0" value={form.bathrooms}
                onChange={e => set('bathrooms', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Area (m²)</label>
              <input type="number" min="0" step="0.01" value={form.area}
                onChange={e => set('area', e.target.value)} className="input-field" />
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
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href="/admin/properties" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

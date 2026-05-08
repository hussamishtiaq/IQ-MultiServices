'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Trash2, Loader2, Save, X, MapPin, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Area } from '@/types'

interface AreaForm {
  slug: string
  name: string
  city: string
  hero_image: string
  description: string
  amenities: string
  popular_unit_types: string
  avg_price_sale_aed: string
  avg_price_rent_aed: string
  display_order: string
}

const empty = (): AreaForm => ({
  slug: '', name: '', city: 'Dubai', hero_image: '', description: '',
  amenities: '', popular_unit_types: 'Studio,1BR,2BR,3BR',
  avg_price_sale_aed: '', avg_price_rent_aed: '', display_order: '0',
})

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 64)

export default function AdminAreasPage() {
  const [areas, setAreas]     = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Area | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState<AreaForm>(empty())

  const load = async () => {
    const supabase = createClient()
    const { data, error: dbErr } = await supabase
      .from('areas').select('*').order('display_order', { ascending: true })
    if (dbErr) setError(dbErr.message)
    setAreas((data as Area[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k: keyof AreaForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  const startEdit = (a: Area) => {
    setEditing(a); setShowAdd(false); setError(null)
    setForm({
      slug: a.slug,
      name: a.name,
      city: a.city,
      hero_image: a.hero_image ?? '',
      description: a.description ?? '',
      amenities: (a.amenities ?? []).join(', '),
      popular_unit_types: (a.popular_unit_types ?? []).join(', '),
      avg_price_sale_aed: a.avg_price_sale_aed != null ? String(a.avg_price_sale_aed) : '',
      avg_price_rent_aed: a.avg_price_rent_aed != null ? String(a.avg_price_rent_aed) : '',
      display_order: String(a.display_order),
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)

    const payload = {
      slug:               (form.slug.trim() || slugify(form.name)),
      name:               form.name.trim(),
      city:               form.city.trim() || 'Dubai',
      hero_image:         form.hero_image.trim() || null,
      description:        form.description.trim() || null,
      amenities:          form.amenities.split(',').map(s => s.trim()).filter(Boolean),
      popular_unit_types: form.popular_unit_types.split(',').map(s => s.trim()).filter(Boolean),
      avg_price_sale_aed: form.avg_price_sale_aed ? parseFloat(form.avg_price_sale_aed) : null,
      avg_price_rent_aed: form.avg_price_rent_aed ? parseFloat(form.avg_price_rent_aed) : null,
      display_order:      parseInt(form.display_order) || 0,
    }

    const supabase = createClient()
    if (editing) {
      const { error: dbErr } = await supabase.from('areas').update(payload).eq('id', editing.id)
      if (dbErr) { setError(dbErr.message); setSaving(false); return }
    } else {
      const { error: dbErr } = await supabase.from('areas').insert(payload)
      if (dbErr) { setError(dbErr.message); setSaving(false); return }
    }
    setSaving(false); setEditing(null); setShowAdd(false); setForm(empty())
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this area? Properties will be unassigned but not deleted.')) return
    setDeleting(id); setError(null)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('areas').delete().eq('id', id)
    setDeleting(null)
    if (dbErr) { setError(`Failed to delete: ${dbErr.message}`); return }
    setAreas(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Areas</h1>
          <p className="text-slate-500 text-sm mt-1">{areas.length} area{areas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm(empty()); setError(null) }}
          className="btn-primary text-sm py-2">
          <Plus size={16} /> Add Area
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      {(showAdd || editing) && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-emerald-600 rounded-full" />
              <h2 className="font-semibold text-slate-900">{editing ? `Edit: ${editing.name}` : 'New Area'}</h2>
            </div>
            <button onClick={() => { setShowAdd(false); setEditing(null); setError(null) }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input value={form.name} onChange={e => { set('name', e.target.value); if (!editing && !form.slug) set('slug', slugify(e.target.value)) }}
                  className="input-field" placeholder="Dubai Marina" required />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input value={form.slug} onChange={e => set('slug', slugify(e.target.value))}
                  className="input-field" placeholder="dubai-marina" required />
              </div>
              <div>
                <label className="label">City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Display Order</label>
                <input type="number" min="0" value={form.display_order}
                  onChange={e => set('display_order', e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Hero Image URL</label>
              <input value={form.hero_image} onChange={e => set('hero_image', e.target.value)}
                className="input-field" placeholder="https://res.cloudinary.com/…" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} className="input-field resize-none"
                placeholder="Iconic waterfront community with high-rise apartments…" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Amenities (comma-separated)</label>
                <input value={form.amenities} onChange={e => set('amenities', e.target.value)}
                  className="input-field" placeholder="Beach, Metro, Schools, Gym" />
              </div>
              <div>
                <label className="label">Popular Unit Types</label>
                <input value={form.popular_unit_types} onChange={e => set('popular_unit_types', e.target.value)}
                  className="input-field" placeholder="Studio, 1BR, 2BR, 3BR" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Avg Sale Price (AED)</label>
                <input type="number" min="0" step="0.01" value={form.avg_price_sale_aed}
                  onChange={e => set('avg_price_sale_aed', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Avg Annual Rent (AED)</label>
                <input type="number" min="0" step="0.01" value={form.avg_price_rent_aed}
                  onChange={e => set('avg_price_rent_aed', e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Area')}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setEditing(null) }} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : areas.length === 0 && !showAdd ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <MapPin size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600 mb-1">No areas yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="relative aspect-[16/10] bg-slate-100">
                {a.hero_image ? (
                  <Image src={a.hero_image} alt={a.name} fill className="object-cover" sizes="(max-width:1024px) 50vw, 33vw" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                    <MapPin size={32} className="text-emerald-700/40" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.slug} · order {a.display_order}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      {deleting === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                {a.description && <p className="text-xs text-slate-500 line-clamp-2 mt-2">{a.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

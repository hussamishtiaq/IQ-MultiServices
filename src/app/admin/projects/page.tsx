'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Plus, Edit, Trash2, Loader2, Save, X, Building2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/format'
import type { Project, Developer, Area } from '@/types'

interface Form {
  slug: string
  name: string
  developer_id: string
  area_id: string
  starting_price_aed: string
  payment_plan: string
  payment_plan_desc: string
  handover_quarter: string
  handover_date: string
  status: 'pre_launch' | 'launched' | 'under_construction' | 'ready'
  unit_types: string
  hero_image: string
  brochure_url: string
  masterplan_url: string
  amenities: string
  description: string
  featured: boolean
}
const empty = (): Form => ({
  slug: '', name: '', developer_id: '', area_id: '',
  starting_price_aed: '', payment_plan: '', payment_plan_desc: '',
  handover_quarter: '', handover_date: '', status: 'launched',
  unit_types: '1BR, 2BR, 3BR', hero_image: '', brochure_url: '', masterplan_url: '',
  amenities: '', description: '', featured: false,
})
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80)
const STATUSES = ['pre_launch', 'launched', 'under_construction', 'ready'] as const

interface ProjectWithRefs extends Project {
  developers: { name: string } | null
  areas:      { name: string } | null
}

export default function AdminProjectsPage() {
  const [list, setList] = useState<ProjectWithRefs[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Project | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty())

  const load = async () => {
    const supabase = createClient()
    const [pRes, dRes, aRes] = await Promise.all([
      supabase.from('projects').select('*, developers(name), areas(name)').order('created_at', { ascending: false }),
      supabase.from('developers').select('*').order('display_order', { ascending: true }),
      supabase.from('areas').select('*').order('display_order', { ascending: true }),
    ])
    if (pRes.error) setError(pRes.error.message)
    setList((pRes.data as unknown as ProjectWithRefs[]) ?? [])
    setDevelopers((dRes.data as Developer[]) ?? [])
    setAreas((aRes.data as Area[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const set = (k: keyof Form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const startEdit = (p: Project) => {
    setEditing(p); setShowAdd(false); setError(null)
    setForm({
      slug: p.slug,
      name: p.name,
      developer_id: p.developer_id ?? '',
      area_id: p.area_id ?? '',
      starting_price_aed: p.starting_price_aed != null ? String(p.starting_price_aed) : '',
      payment_plan: p.payment_plan ?? '',
      payment_plan_desc: p.payment_plan_desc ?? '',
      handover_quarter: p.handover_quarter ?? '',
      handover_date: p.handover_date ?? '',
      status: p.status,
      unit_types: (p.unit_types ?? []).join(', '),
      hero_image: p.hero_image ?? '',
      brochure_url: p.brochure_url ?? '',
      masterplan_url: p.masterplan_url ?? '',
      amenities: (p.amenities ?? []).join(', '),
      description: p.description ?? '',
      featured: p.featured,
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.developer_id) { setError('Name and developer are required.'); return }
    setSaving(true); setError(null)

    const payload = {
      slug:               form.slug.trim() || slugify(form.name),
      name:               form.name.trim(),
      developer_id:       form.developer_id,
      area_id:            form.area_id || null,
      starting_price_aed: form.starting_price_aed ? parseFloat(form.starting_price_aed) : null,
      payment_plan:       form.payment_plan.trim() || null,
      payment_plan_desc:  form.payment_plan_desc.trim() || null,
      handover_quarter:   form.handover_quarter.trim() || null,
      handover_date:      form.handover_date || null,
      status:             form.status,
      unit_types:         form.unit_types.split(',').map(s => s.trim()).filter(Boolean),
      hero_image:         form.hero_image.trim() || null,
      brochure_url:       form.brochure_url.trim() || null,
      masterplan_url:     form.masterplan_url.trim() || null,
      amenities:          form.amenities.split(',').map(s => s.trim()).filter(Boolean),
      description:        form.description.trim() || null,
      featured:           form.featured,
    }

    const supabase = createClient()
    const { error: dbErr } = editing
      ? await supabase.from('projects').update(payload).eq('id', editing.id)
      : await supabase.from('projects').insert(payload)
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setEditing(null); setShowAdd(false); setForm(empty()); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return
    setDeleting(id); setError(null)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('projects').delete().eq('id', id)
    setDeleting(null)
    if (dbErr) { setError(`Failed to delete: ${dbErr.message}`); return }
    setList(p => p.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Off-plan Projects</h1>
          <p className="text-slate-500 text-sm mt-1">{list.length} project{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm(empty()); setError(null) }}
          className="btn-primary text-sm py-2"
          disabled={developers.length === 0}>
          <Plus size={16} /> Add Project
        </button>
      </div>

      {developers.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl mb-4">
          Add a developer first in <a href="/admin/developers" className="font-semibold underline">Developers</a>.
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      {(showAdd || editing) && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-emerald-600 rounded-full" />
              <h2 className="font-semibold text-slate-900">{editing ? `Edit: ${editing.name}` : 'New Project'}</h2>
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
                <input value={form.name}
                  onChange={e => { set('name', e.target.value); if (!editing && !form.slug) set('slug', slugify(e.target.value)) }}
                  className="input-field" placeholder="Marina Vista" required />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input value={form.slug} onChange={e => set('slug', slugify(e.target.value))} className="input-field" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Developer *</label>
                <select value={form.developer_id} onChange={e => set('developer_id', e.target.value)} className="input-field" required>
                  <option value="">— Select —</option>
                  {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Area</label>
                <select value={form.area_id} onChange={e => set('area_id', e.target.value)} className="input-field">
                  <option value="">— None —</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Starting Price (AED)</label>
                <input type="number" min="0" step="0.01" value={form.starting_price_aed} onChange={e => set('starting_price_aed', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Payment Plan</label>
                <input value={form.payment_plan} onChange={e => set('payment_plan', e.target.value)} className="input-field" placeholder="10/70/20" />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value as Form['status'])} className="input-field">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Handover Quarter</label>
                <input value={form.handover_quarter} onChange={e => set('handover_quarter', e.target.value)} className="input-field" placeholder="Q4 2028" />
              </div>
              <div>
                <label className="label">Handover Date</label>
                <input type="date" value={form.handover_date} onChange={e => set('handover_date', e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Unit Types (comma-separated)</label>
              <input value={form.unit_types} onChange={e => set('unit_types', e.target.value)} className="input-field" placeholder="1BR, 2BR, 3BR" />
            </div>
            <div>
              <label className="label">Hero Image URL</label>
              <input value={form.hero_image} onChange={e => set('hero_image', e.target.value)} className="input-field" placeholder="https://res.cloudinary.com/…" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Brochure URL</label>
                <input value={form.brochure_url} onChange={e => set('brochure_url', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Masterplan URL</label>
                <input value={form.masterplan_url} onChange={e => set('masterplan_url', e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Amenities (comma-separated)</label>
              <input value={form.amenities} onChange={e => set('amenities', e.target.value)} className="input-field" placeholder="Pool, Gym, Beach access, Concierge" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} className="input-field resize-none" />
            </div>
            <div>
              <label className="label">Payment Plan Description</label>
              <textarea value={form.payment_plan_desc} onChange={e => set('payment_plan_desc', e.target.value)} rows={2} className="input-field resize-none"
                placeholder="10% on booking, 70% during construction, 20% on handover…" />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-medium text-slate-700">Featured project</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Project')}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setEditing(null) }} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>
      ) : list.length === 0 && !showAdd ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <Building2 size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600 mb-1">No projects yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="relative aspect-[16/10] bg-slate-100">
                {p.hero_image ? (
                  <Image src={p.hero_image} alt={p.name} fill className="object-cover" sizes="(max-width:1024px) 50vw, 33vw" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                    <Building2 size={32} className="text-emerald-700/40" />
                  </div>
                )}
                {p.handover_quarter && (
                  <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Calendar size={10} /> {p.handover_quarter}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{p.developers?.name ?? '—'}</p>
                    <p className="font-semibold text-slate-900 line-clamp-1 mt-0.5">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.areas?.name ?? '—'}</p>
                    {p.starting_price_aed != null && (
                      <p className="text-sm font-bold text-emerald-700 mt-1">From {formatPrice(p.starting_price_aed, 'AED')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      {deleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

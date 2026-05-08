'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Plus, Edit, Trash2, Loader2, Save, X, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Developer } from '@/types'

interface Form {
  slug: string; name: string; logo: string; description: string; website: string; display_order: string
}
const empty = (): Form => ({ slug: '', name: '', logo: '', description: '', website: '', display_order: '0' })
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 64)

export default function AdminDevelopersPage() {
  const [list, setList] = useState<Developer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Developer | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty())

  const load = async () => {
    const supabase = createClient()
    const { data, error: dbErr } = await supabase.from('developers').select('*').order('display_order', { ascending: true })
    if (dbErr) setError(dbErr.message)
    setList((data as Developer[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const set = (k: keyof Form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const startEdit = (d: Developer) => {
    setEditing(d); setShowAdd(false); setError(null)
    setForm({
      slug: d.slug, name: d.name, logo: d.logo ?? '', description: d.description ?? '',
      website: d.website ?? '', display_order: String(d.display_order),
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    const payload = {
      slug:        form.slug.trim() || slugify(form.name),
      name:        form.name.trim(),
      logo:        form.logo.trim()        || null,
      description: form.description.trim() || null,
      website:     form.website.trim()     || null,
      display_order: parseInt(form.display_order) || 0,
    }
    const supabase = createClient()
    const { error: dbErr } = editing
      ? await supabase.from('developers').update(payload).eq('id', editing.id)
      : await supabase.from('developers').insert(payload)
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setEditing(null); setShowAdd(false); setForm(empty()); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this developer? Projects under it will block the delete.')) return
    setDeleting(id); setError(null)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('developers').delete().eq('id', id)
    setDeleting(null)
    if (dbErr) { setError(`Failed to delete: ${dbErr.message}`); return }
    setList(p => p.filter(d => d.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Developers</h1>
          <p className="text-slate-500 text-sm mt-1">{list.length} developer{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm(empty()); setError(null) }}
          className="btn-primary text-sm py-2">
          <Plus size={16} /> Add Developer
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      {(showAdd || editing) && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-emerald-600 rounded-full" />
              <h2 className="font-semibold text-slate-900">{editing ? `Edit: ${editing.name}` : 'New Developer'}</h2>
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
                  className="input-field" placeholder="Emaar Properties" required />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input value={form.slug} onChange={e => set('slug', slugify(e.target.value))}
                  className="input-field" placeholder="emaar" required />
              </div>
            </div>
            <div>
              <label className="label">Logo URL</label>
              <input value={form.logo} onChange={e => set('logo', e.target.value)} className="input-field" placeholder="https://res.cloudinary.com/…" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="input-field resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Website</label>
                <input value={form.website} onChange={e => set('website', e.target.value)} className="input-field" placeholder="https://www.emaar.com" />
              </div>
              <div>
                <label className="label">Display Order</label>
                <input type="number" min="0" value={form.display_order} onChange={e => set('display_order', e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Developer')}
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
          <p className="font-semibold text-slate-600 mb-1">No developers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
              {d.logo ? (
                <div className="relative w-12 h-12 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0">
                  <Image src={d.logo} alt={d.name} fill className="object-contain p-1" sizes="48px" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <Building2 size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{d.name}</p>
                <p className="text-xs text-slate-400">{d.slug} · order {d.display_order}</p>
                {d.description && <p className="text-xs text-slate-500 line-clamp-2 mt-1">{d.description}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => startEdit(d)} className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDelete(d.id)} disabled={deleting === d.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                  {deleting === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

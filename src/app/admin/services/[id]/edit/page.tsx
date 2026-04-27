'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/types'

export default function EditServicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState({ title: '', description: '', icon: '', order: '0' })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('services').select('*').eq('id', id).single()
      if (cancelled) return
      if (!data) { setError('Service not found.'); setLoading(false); return }
      const s = data as Service
      setForm({
        title:       s.title,
        description: s.description ?? '',
        icon:        s.icon ?? '',
        order:       String(s.order),
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)

    const supabase = createClient()
    const { error: dbErr } = await supabase.from('services').update({
      title:       form.title.trim(),
      description: form.description.trim() || null,
      icon:        form.icon.trim() || null,
      order:       parseInt(form.order) || 0,
    }).eq('id', id)

    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    router.push('/admin/services')
    router.refresh()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-emerald-600" />
    </div>
  )

  return (
    <div className="max-w-xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/services"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Service</h1>
          <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{form.title}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase size={16} className="text-emerald-700" />
          </div>
          <h2 className="font-semibold text-slate-900">Service Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Icon (emoji)</label>
              <input value={form.icon} onChange={e => set('icon', e.target.value)}
                className="input-field" maxLength={4} />
            </div>
            <div>
              <label className="label">Display Order</label>
              <input type="number" min="0" value={form.order}
                onChange={e => set('order', e.target.value)} className="input-field" />
              <p className="text-xs text-slate-400 mt-1.5">Lower numbers appear first</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link href="/admin/services" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

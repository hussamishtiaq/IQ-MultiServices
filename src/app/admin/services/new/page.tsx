'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewServicePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [form, setForm]     = useState({ title: '', description: '', icon: '', order: '0' })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)

    const supabase = createClient()
    const { error: dbErr } = await supabase.from('services').insert({
      title:       form.title.trim(),
      description: form.description.trim() || null,
      icon:        form.icon.trim() || null,
      order:       parseInt(form.order) || 0,
    })

    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    router.push('/admin/services')
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/services"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Service</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create a new service listing</p>
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
              className="input-field" placeholder="e.g. Property Management" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} className="input-field resize-none" placeholder="Describe this service…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Icon (emoji)</label>
              <input value={form.icon} onChange={e => set('icon', e.target.value)}
                className="input-field" placeholder="🏠" maxLength={4} />
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
              {saving ? 'Saving…' : 'Add Service'}
            </button>
            <Link href="/admin/services" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

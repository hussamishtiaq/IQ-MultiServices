'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CheckCircle2, Globe, Image as ImageIcon, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Settings {
  site_name:  string
  tagline:    string
  about_text: string
  hero_image: string
}

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

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState<Settings>({
    site_name: '', tagline: '', about_text: '', hero_image: '',
  })

  const set = (k: keyof Settings, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('site_settings').select('key, value')
      const map: Record<string, string> = {}
      for (const row of data ?? []) map[row.key] = row.value ?? ''
      setForm({
        site_name:  map['site_name']  ?? 'IQ MultiServices',
        tagline:    map['tagline']    ?? '',
        about_text: map['about_text'] ?? '',
        hero_image: map['hero_image'] ?? '',
      })
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)

    const supabase = createClient()
    const updates = Object.entries(form).map(([key, value]) =>
      supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
    )
    const results = await Promise.all(updates)
    const err = results.find(r => r.error)
    if (err?.error) {
      setError(err.error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-emerald-600" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Site Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your website content and appearance</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Branding */}
        <SectionCard icon={Globe} title="Branding">
          <div>
            <label className="label">Site Name</label>
            <input value={form.site_name} onChange={e => set('site_name', e.target.value)}
              className="input-field" placeholder="Your company name" />
          </div>
          <div>
            <label className="label">Tagline / Slogan</label>
            <input value={form.tagline} onChange={e => set('tagline', e.target.value)}
              className="input-field" placeholder="A short description of your business" />
            <p className="text-xs text-slate-400 mt-1.5">Displayed beneath the site name in the homepage hero</p>
          </div>
        </SectionCard>

        {/* Hero */}
        <SectionCard icon={ImageIcon} title="Homepage Hero">
          <div>
            <label className="label">Hero Background Image URL</label>
            <input value={form.hero_image} onChange={e => set('hero_image', e.target.value)}
              className="input-field" placeholder="https://… or leave blank to use the default gradient" />
            <p className="text-xs text-slate-400 mt-1.5">
              Paste a public image URL (e.g. from Supabase Storage) to use as the full-screen hero background.
              Leave blank to keep the default dark gradient.
            </p>
          </div>
          {form.hero_image && (
            <div className="relative h-32 rounded-xl overflow-hidden border border-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.hero_image} alt="Hero preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span className="text-white text-xs font-medium bg-black/40 px-2 py-1 rounded-lg">Preview</span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Content */}
        <SectionCard icon={FileText} title="About Content">
          <div>
            <label className="label">About Text</label>
            <textarea value={form.about_text} onChange={e => set('about_text', e.target.value)}
              rows={6} className="input-field resize-none"
              placeholder="Describe your business, mission, and what makes you unique…" />
            <p className="text-xs text-slate-400 mt-1.5">Displayed on the Services page above the service listings</p>
          </div>
        </SectionCard>

        {/* Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
            <CheckCircle2 size={16} /> Settings saved successfully
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}

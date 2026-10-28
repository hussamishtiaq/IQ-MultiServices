'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FEATURE_PREFIX, SITE_FEATURES, parseFeatures, type FeatureKey, type SiteFeatures } from '@/lib/site-features'

const GROUPS = Array.from(new Set(SITE_FEATURES.map(f => f.group)))
const GROUP_HINT: Record<string, string> = {
  Messaging: 'Keep these hidden until WhatsApp and email are connected, so visitors only see features that work end to end.',
  'Property page': 'Extra information shown to buyers on listing pages.',
}

export default function AppearancePage() {
  const [features, setFeatures] = useState<SiteFeatures | null>(null)
  const [saved, setSaved] = useState<SiteFeatures | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ignore a load that finishes after this effect was torn down, so it can't overwrite edits.
    let active = true
    createClient().from('site_settings').select('key, value').like('key', `${FEATURE_PREFIX}%`)
      .then(({ data, error: e }) => {
        if (!active) return
        if (e) setError(e.message)
        const f = parseFeatures(data ?? [])
        setFeatures(f); setSaved(f)
      })
    return () => { active = false }
  }, [])

  const dirty = !!features && !!saved && SITE_FEATURES.some(f => features[f.key] !== saved[f.key])

  const toggle = (k: FeatureKey) => setFeatures(f => f && { ...f, [k]: !f[k] })

  const save = async () => {
    if (!features) return
    setSaving(true); setError(null); setNotice(null)
    const res = await fetch('/api/admin/features', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(features) })
    const j = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(j.error ?? 'Save failed'); return }
    setSaved(features)
    setNotice('Saved. The public site updates immediately.')
    setTimeout(() => setNotice(null), 4000)
  }

  if (!features) return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appearance</h1>
          <p className="text-slate-500 text-sm mt-1">Choose which features visitors see on the public website. Hidden features are also switched off on the server, so they can&apos;t be used through old links.</p>
        </div>
        <button onClick={save} disabled={!dirty || saving} className="btn-primary text-sm px-4 py-2">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
      {notice && <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 size={15} /> {notice}</p>}

      <div className="space-y-6">
        {GROUPS.map(group => (
          <section key={group} className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{group}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{GROUP_HINT[group]}</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {SITE_FEATURES.filter(f => f.group === group).map(f => {
                const on = features[f.key]
                return (
                  <li key={f.key} className="px-6 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        {f.label}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {on ? <Eye size={11} /> : <EyeOff size={11} />} {on ? 'Visible' : 'Hidden'}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{f.description}</p>
                    </div>
                    <button role="switch" aria-checked={on} aria-label={f.label} onClick={() => toggle(f.key)}
                      className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors ${on ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-6">The admin Messaging, Viewings and Agents pages stay available to you either way. Unsubscribe links in emails always keep working.</p>
    </div>
  )
}

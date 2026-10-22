'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Ban, Loader2, Search, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AudienceContact, Suppression } from '@/lib/messaging/types'
import { Badge, fmtDate } from '../ui'

const BASES = [
  { value: 'none', label: 'No consent / unknown', hint: 'Bought, scraped or collected lists. They can still receive 1:1 replies and utility messages, but never marketing.' },
  { value: 'existing_relationship', label: 'Existing business relationship', hint: 'Past clients, landlords, partner agencies you have dealt with. Allows marketing EMAIL with unsubscribe. Not WhatsApp.' },
  { value: 'documented_opt_in', label: 'Documented opt-in', hint: 'They signed up (form, event sheet, website) and you can prove it. Allows email + WhatsApp marketing.' },
] as const

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [basis, setBasis] = useState<(typeof BASES)[number]['value']>('none')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setError(null); setResult(null)
    const res = await fetch('/api/messaging/contacts/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, basis, note, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(j.error ?? 'Import failed'); return }
    setResult(`${j.created} created, ${j.updated} updated${j.invalid?.length ? `, ${j.invalid.length} rows rejected (${j.invalid.slice(0, 5).map((i: { line: number; reason: string }) => `line ${i.line}: ${i.reason}`).join('; ')}${j.invalid.length > 5 ? '…' : ''})` : ''}.`)
    setCsv(''); setFileName('')
    onDone()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Import contacts (CSV)</h2>
        <p className="text-xs text-slate-500 mt-1">Columns: <code>name, email, phone, company, tags, type</code>. Tags separated by <code>;</code>, type is client / b2b / lead / other. UAE numbers without a country code get +971. Existing contacts are merged, never duplicated, and opt-outs are never overridden.</p>
      </div>
      <label className="flex items-center gap-2 w-fit cursor-pointer btn-secondary text-sm px-4 py-2">
        <Upload size={14} /> {fileName || 'Choose CSV file'}
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return
          setFileName(f.name); setCsv(await f.text())
        }} />
      </label>
      <div>
        <p className="label text-xs">Where did these contacts come from? (stored as your legal basis)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {BASES.map(b => (
            <button key={b.value} type="button" onClick={() => setBasis(b.value)}
              className={`text-left p-3 rounded-xl border-2 ${basis === b.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
              <p className="text-sm font-semibold text-slate-800">{b.label}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{b.hint}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Evidence / note {basis !== 'none' && <span className="text-red-500">*</span>}</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="input-field" placeholder="e.g. Cityscape 2026 sign-up sheet; clients closed 2023–2025" />
        </div>
        <div>
          <label className="label text-xs">Add tags to all imported</label>
          <input value={tags} onChange={e => setTags(e.target.value)} className="input-field" placeholder="cityscape-2026" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
      {result && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">{result}</p>}
      <button onClick={submit} disabled={!csv || busy || (basis !== 'none' && !note.trim())} className="btn-primary text-sm px-4 py-2">
        {busy && <Loader2 size={14} className="animate-spin" />} Import
      </button>
    </div>
  )
}

function ContactsInner() {
  const params = useSearchParams()
  const [view, setView] = useState<'contacts' | 'suppressed'>(params.get('view') === 'suppressed' ? 'suppressed' : 'contacts')
  const [contacts, setContacts] = useState<AudienceContact[]>([])
  const [suppressions, setSuppressions] = useState<Suppression[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    const [c, s] = await Promise.all([
      db.from('audience_contacts').select('*').order('created_at', { ascending: false }).limit(2000),
      db.from('suppressions').select('*').order('created_at', { ascending: false }).limit(2000),
    ])
    if (c.error) setError(c.error.message)
    setContacts((c.data as AudienceContact[]) ?? [])
    setSuppressions((s.data as Suppression[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const suppressContact = async (c: AudienceContact) => {
    if (!confirm(`Stop all messages to ${c.name ?? c.email ?? c.phone}?`)) return
    const db = createClient()
    const rows = [
      c.email && { channel: 'email', address: c.email, reason: 'manual' },
      c.phone && { channel: 'whatsapp', address: c.phone, reason: 'manual' },
    ].filter(Boolean)
    const { error: e1 } = await db.from('suppressions').upsert(rows, { onConflict: 'channel,address', ignoreDuplicates: true })
    const now = new Date().toISOString()
    const { error: e2 } = await db.from('audience_contacts').update({
      email_consent: 'opted_out', email_consent_at: now, email_consent_source: 'admin',
      whatsapp_consent: 'opted_out', whatsapp_consent_at: now, whatsapp_consent_source: 'admin',
    }).eq('id', c.id)
    if (e1 || e2) setError((e1 ?? e2)!.message)
    load()
  }

  const removeSuppression = async (s: Suppression) => {
    if (s.reason === 'complaint' || s.reason === 'hard_bounce') {
      alert('Spam complaints and hard bounces cannot be removed. Mailing them again damages your sender reputation.')
      return
    }
    if (!confirm(`Remove ${s.address} from the suppression list? Only do this if the person asked to resubscribe.`)) return
    await createClient().from('suppressions').delete().eq('id', s.id)
    load()
  }

  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? contacts.filter(c => [c.name, c.email, c.phone, c.company, ...c.tags].some(v => v?.toLowerCase().includes(needle)))
    : contacts

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audience</h1>
          <p className="text-slate-500 text-sm mt-1">{contacts.length} contacts · {suppressions.length} suppressed addresses</p>
        </div>
        <button onClick={() => setShowImport(s => !s)} className="btn-primary text-sm px-4 py-2"><Upload size={15} /> Import CSV</button>
      </div>

      {showImport && <ImportPanel onDone={load} />}
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['contacts', 'suppressed'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === v ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {v === 'contacts' ? 'Contacts' : 'Suppression list'}
          </button>
        ))}
        {view === 'contacts' && (
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, phone, tag" className="input-field pl-8 py-1.5 text-sm w-64" />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : view === 'contacts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Email consent</th><th className="px-4 py-3">WhatsApp consent</th><th className="px-4 py-3 hidden lg:table-cell">Tags</th><th className="px-4 py-3 hidden lg:table-cell">Source</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No contacts. Import a CSV, or they&apos;ll appear as leads tick the consent boxes and people message you.</td></tr>}
                {filtered.map(c => (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.name ?? '—'} {c.company && <span className="text-xs text-slate-400">· {c.company}</span>}</p>
                      <p className="text-xs text-slate-500">{c.email ?? ''}{c.email && c.phone ? ' · ' : ''}{c.phone ? `+${c.phone}` : ''}</p>
                    </td>
                    <td className="px-4 py-3"><Badge value={c.email_consent} />{c.email_consent_source && <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] truncate" title={c.email_consent_source}>{c.email_consent_source}</p>}</td>
                    <td className="px-4 py-3"><Badge value={c.whatsapp_consent} />{c.whatsapp_consent_source && <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] truncate" title={c.whatsapp_consent_source}>{c.whatsapp_consent_source}</p>}</td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="flex flex-wrap gap-1">{c.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-600">{t}</span>)}</div></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{c.source} · {c.contact_type}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => suppressContact(c)} title="Stop all messages" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Ban size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr><th className="px-4 py-3">Address</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3 hidden md:table-cell">When</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppressions.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nobody has unsubscribed, bounced or complained yet.</td></tr>}
              {suppressions.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono text-xs">{s.channel === 'whatsapp' ? `+${s.address}` : s.address}</td>
                  <td className="px-4 py-3 capitalize">{s.channel}</td>
                  <td className="px-4 py-3"><Badge value={s.reason} />{s.detail && <p className="text-[10px] text-slate-400 mt-1">{s.detail}</p>}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">{fmtDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => removeSuppression(s)} className="text-xs text-slate-400 hover:text-slate-700">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function ContactsPage() {
  return <Suspense><ContactsInner /></Suspense>
}

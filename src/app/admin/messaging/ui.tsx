'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-800', delivered: 'bg-emerald-100 text-emerald-800',
  read: 'bg-emerald-200 text-emerald-900', failed: 'bg-red-100 text-red-700', bounced: 'bg-red-100 text-red-700',
  complained: 'bg-red-200 text-red-900', skipped: 'bg-amber-100 text-amber-800', received: 'bg-violet-100 text-violet-800',
  draft: 'bg-slate-100 text-slate-600', sending: 'bg-blue-100 text-blue-800', paused: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-slate-200 text-slate-500',
  opted_in: 'bg-emerald-100 text-emerald-800', implied: 'bg-sky-100 text-sky-800', unknown: 'bg-slate-100 text-slate-500',
  opted_out: 'bg-red-100 text-red-700',
}

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${STATUS_STYLES[value] ?? 'bg-slate-100 text-slate-600'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}

export function DispatchButton({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const run = async () => {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/messaging/dispatch', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg(j.error ?? 'Dispatch failed'); return }
    const part = (r: { sent: number; skipped: number; failed: number; deferred: string | null; paused: string | null }, label: string) =>
      `${label}: ${r.sent} sent${r.skipped ? `, ${r.skipped} skipped` : ''}${r.failed ? `, ${r.failed} failed` : ''}${r.deferred ? ` (${r.deferred.replace(/_/g, ' ')})` : ''}${r.paused ? ` — PAUSED: ${r.paused}` : ''}`
    setMsg(`${part(j.email, 'Email')} · ${part(j.whatsapp, 'WhatsApp')}${j.dryRun ? ' · DRY RUN' : ''}`)
    onDone?.()
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={busy} className="btn-primary text-sm px-4 py-2">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send next batch now
      </button>
      {msg && <p className="text-xs text-slate-500 max-w-md text-right">{msg}</p>}
    </div>
  )
}

export function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

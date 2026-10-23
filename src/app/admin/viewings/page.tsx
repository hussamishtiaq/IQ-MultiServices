'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDubaiTime } from '@/lib/sales/core'
import type { Agent, Viewing } from '@/lib/sales/server'

type Row = Viewing & { property: { title: string; slug: string | null } | null }

const STATUS_STYLE: Record<Viewing['status'], string> = {
  requested: 'bg-amber-100 text-amber-800', confirmed: 'bg-emerald-100 text-emerald-800', completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700', no_show: 'bg-red-50 text-red-600',
}

export default function ViewingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    const now = new Date().toISOString()
    let q = db.from('viewings').select('*, property:properties(title, slug)')
    q = view === 'upcoming' ? q.gte('scheduled_at', now).order('scheduled_at') : q.lt('scheduled_at', now).order('scheduled_at', { ascending: false })
    const [v, a] = await Promise.all([q.limit(300), db.from('agents').select('*').order('name')])
    if (v.error) setError(v.error.message)
    setRows((v.data as Row[]) ?? [])
    setAgents((a.data as Agent[]) ?? [])
    setLoading(false)
  }, [view])

  useEffect(() => { setLoading(true); load() }, [load])

  const setStatus = async (id: string, status: Viewing['status']) => {
    setBusy(id); setError(null)
    const res = await fetch(`/api/sales/viewings/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setError(j.error ?? 'Update failed'); return }
    load()
  }

  const setAgent = async (id: string, agentId: string) => {
    const { error: e } = await createClient().from('viewings').update({ agent_id: agentId || null }).eq('id', id)
    if (e) setError(/unique|duplicate/i.test(e.message) ? 'That agent already has a viewing at this time.' : e.message)
    load()
  }

  const agentName = new Map(agents.map(a => [a.id, a.name]))
  const pending = rows.filter(r => r.status === 'requested').length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Viewings</h1>
          <p className="text-slate-500 text-sm mt-1">Confirming sends the customer a confirmation. Reminders go out automatically about a day before.{pending ? ` ${pending} awaiting confirmation.` : ''}</p>
        </div>
        <div className="flex gap-2">
          {(['upcoming', 'past'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${view === v ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{v}</button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500"><CalendarDays size={28} className="mx-auto text-slate-300 mb-2" />No {view} viewings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr><th className="px-4 py-3">When (Dubai)</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3 hidden md:table-cell">Property</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} data-testid="viewing-row">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{formatDubaiTime(r.scheduled_at)}
                      {r.reminder_sent_at && <p className="text-[10px] text-slate-400 font-normal">reminder sent</p>}</td>
                    <td className="px-4 py-3"><p className="text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.phone}{r.email ? ` · ${r.email}` : ''}</p></td>
                    <td className="px-4 py-3 hidden md:table-cell">{r.property ? <Link href={`/properties/${r.property.slug ?? r.property_id}`} target="_blank" className="hover:text-emerald-700">{r.property.title}</Link> : '—'}</td>
                    <td className="px-4 py-3">
                      <select value={r.agent_id ?? ''} onChange={e => setAgent(r.id, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1" aria-label="Agent">
                        <option value="">Unassigned</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.active ? '' : ' (inactive)'}</option>)}
                      </select>
                      {r.agent_id && !agentName.has(r.agent_id) && <span className="text-xs text-slate-400"> removed</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${STATUS_STYLE[r.status]}`}>{r.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {busy === r.id ? <Loader2 size={14} className="animate-spin inline text-slate-400" /> : (
                        <div className="inline-flex gap-1">
                          {r.status === 'requested' && <button onClick={() => setStatus(r.id, 'confirmed')} className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold">Confirm</button>}
                          {r.status === 'confirmed' && view === 'past' && <button onClick={() => setStatus(r.id, 'completed')} className="px-2.5 py-1 rounded-lg bg-slate-800 text-white text-xs font-semibold">Done</button>}
                          {r.status === 'confirmed' && view === 'past' && <button onClick={() => setStatus(r.id, 'no_show')} className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100">No-show</button>}
                          {['requested', 'confirmed'].includes(r.status) && <button onClick={() => setStatus(r.id, 'cancelled')} className="px-2.5 py-1 rounded-lg text-xs text-red-600 hover:bg-red-50">Cancel</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

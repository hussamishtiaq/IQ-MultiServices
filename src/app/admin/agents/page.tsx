'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizeEmail, normalizePhone } from '@/lib/messaging/compliance'
import type { Agent } from '@/lib/sales/server'

const EMPTY = { name: '', email: '', phone: '', brn: '' }

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<Record<string, { leads: number; open: number }>>({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    const [a, l] = await Promise.all([
      db.from('agents').select('*').order('created_at'),
      db.from('leads').select('assigned_agent_id, status').not('assigned_agent_id', 'is', null).limit(1000),
    ])
    if (a.error) setError(a.error.message)
    setAgents((a.data as Agent[]) ?? [])
    const s: Record<string, { leads: number; open: number }> = {}
    for (const r of (l.data ?? []) as Array<{ assigned_agent_id: string; status: string }>) {
      s[r.assigned_agent_id] ??= { leads: 0, open: 0 }
      s[r.assigned_agent_id].leads++
      if (!['converted', 'lost'].includes(r.status)) s[r.assigned_agent_id].open++
    }
    setStats(s)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = form.email.trim() ? normalizeEmail(form.email) : null
    const phone = form.phone.trim() ? normalizePhone(form.phone) : null
    if (form.email.trim() && !email) { setError('Invalid email'); return }
    if (form.phone.trim() && !phone) { setError('Invalid phone'); return }
    setSaving(true); setError(null)
    const { error: e1 } = await createClient().from('agents').insert({ name: form.name.trim(), email, phone, brn: form.brn.trim() || null })
    setSaving(false)
    if (e1) { setError(e1.message); return }
    setForm(EMPTY)
    load()
  }

  const toggle = async (a: Agent) => {
    await createClient().from('agents').update({ active: !a.active }).eq('id', a.id)
    load()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agents</h1>
        <p className="text-slate-500 text-sm mt-1">New leads and viewings are assigned round-robin to active agents, who get an email for each one.</p>
      </div>

      <form onSubmit={add} className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div><label className="label text-xs">Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Sara Ahmed" /></div>
        <div><label className="label text-xs">Email (gets lead alerts)</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="sara@iq.ae" /></div>
        <div><label className="label text-xs">Phone / WhatsApp</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+971 50…" /></div>
        <div><label className="label text-xs">RERA BRN</label><input value={form.brn} onChange={e => setForm({ ...form, brn: e.target.value })} className="input-field" placeholder="12345" /></div>
        <button disabled={saving} className="btn-primary py-2.5 text-sm">{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add agent</button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : agents.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500"><UserCheck size={28} className="mx-auto text-slate-300 mb-2" />No agents yet. Leads stay unassigned until you add one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr><th className="px-4 py-3">Agent</th><th className="px-4 py-3 hidden md:table-cell">Contact</th><th className="px-4 py-3">Leads (open)</th><th className="px-4 py-3 hidden md:table-cell">Last assigned</th><th className="px-4 py-3">Active</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{a.name}</p>{a.brn && <p className="text-xs text-slate-400">BRN {a.brn}</p>}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{a.email}{a.email && a.phone ? ' · ' : ''}{a.phone ? `+${a.phone}` : ''}</td>
                  <td className="px-4 py-3">{stats[a.id]?.leads ?? 0} <span className="text-slate-400">({stats[a.id]?.open ?? 0})</span></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{a.last_assigned_at ? new Date(a.last_assigned_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(a)} aria-label={`Toggle ${a.name}`}
                      className={`w-10 h-6 rounded-full relative transition-colors ${a.active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${a.active ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

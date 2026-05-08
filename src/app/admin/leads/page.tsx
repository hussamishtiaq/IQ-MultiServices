'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageSquare, Phone as PhoneIcon, Mail, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus } from '@/types'

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:       'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  qualified: 'bg-purple-100 text-purple-800',
  converted: 'bg-emerald-100 text-emerald-800',
  lost:      'bg-slate-100 text-slate-500',
}

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  phone:    PhoneIcon,
  email:    Mail,
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminLeadsPage() {
  const [leads, setLeads]     = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filter, setFilter]   = useState<LeadStatus | 'all'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data, error: dbErr } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (dbErr) setError(dbErr.message)
    setLeads((data as Lead[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: LeadStatus) => {
    setUpdating(id); setError(null)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('leads').update({ status }).eq('id', id)
    setUpdating(null)
    if (dbErr) { setError(dbErr.message); return }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)
  const counts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Inbox</h1>
          <p className="text-slate-500 text-sm mt-1">{leads.length} total · {counts.new ?? 0} new</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All ({leads.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === s ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <MessageSquare size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600 mb-1">No leads yet</p>
          <p className="text-slate-400 text-sm">Leads will appear here when users submit contact forms</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Name & Phone</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Channel</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Source</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">When</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(l => {
                const Icon = CHANNEL_ICONS[l.preferred_contact ?? 'whatsapp'] ?? MessageSquare
                const waNumber = (l.country_code ?? '') + l.phone.replace(/\D/g, '')
                const waUrl = `https://wa.me/${waNumber.replace(/\D/g, '')}`
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{l.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{l.country_code ?? ''} {l.phone}</p>
                      {l.email && <p className="text-xs text-slate-400 mt-0.5">{l.email}</p>}
                      {l.message && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 max-w-xs italic">"{l.message}"</p>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 capitalize text-slate-600">
                        <Icon size={13} className="text-emerald-600" />
                        {l.preferred_contact}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-slate-500">
                      <span className="inline-flex items-center gap-1 capitalize">{l.source ?? '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={l.status}
                        onChange={e => updateStatus(l.id, e.target.value as LeadStatus)}
                        disabled={updating === l.id}
                        className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-md border-0 ${STATUS_COLORS[l.status]} cursor-pointer`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">{formatDate(l.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <a href={`tel:${(l.country_code ?? '') + l.phone}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Call">
                          <PhoneIcon size={14} />
                        </a>
                        <a href={waUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                          title="WhatsApp">
                          <MessageSquare size={14} />
                        </a>
                        {l.property_id && (
                          <Link href={`/properties/${l.property_id}`} target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                            title="View property">
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

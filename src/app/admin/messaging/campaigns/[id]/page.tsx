'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, Message } from '@/lib/messaging/types'
import { Badge, DispatchButton, fmtDate } from '../../ui'

type Row = Pick<Message, 'id' | 'to_address' | 'status' | 'error' | 'sent_at' | 'delivered_at' | 'read_at'>

export default function CampaignDetail({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    const [c, m, n] = await Promise.all([
      db.from('campaigns').select('*').eq('id', params.id).single(),
      db.from('messages').select('id,to_address,status,error,sent_at,delivered_at,read_at').eq('campaign_id', params.id).order('created_at').limit(1000),
      db.rpc('campaign_status_counts', { cid: params.id }),
    ])
    setCounts(Object.fromEntries(((n.data as Array<{ status: string; n: number }>) ?? []).map(r => [r.status, r.n])))
    if (c.error) setError(c.error.message)
    setCampaign(c.data as Campaign)
    setRows((m.data as Row[]) ?? [])
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  const act = async (action: string) => {
    if (action === 'cancel' && !confirm('Cancel this campaign? Queued messages will not be sent.')) return
    setBusy(action); setError(null); setNotice(null)
    const res = await fetch(`/api/messaging/campaigns/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setError(j.error ?? 'Action failed'); return }
    if (action === 'launch') {
      const skipped = Object.entries(j.skipped as Record<string, number>).map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ')
      setNotice(`Queued ${j.queued} recipients.${skipped ? ` Skipped: ${skipped}.` : ''} Sending runs in throttled batches.`)
    }
    load()
  }

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
  if (!campaign) return <p className="text-sm text-red-600">{error ?? 'Not found'}</p>

  const skipReasons = rows.filter(r => r.status === 'skipped' || r.status === 'failed')
    .reduce<Record<string, number>>((a, r) => { const k = r.error ?? 'unknown'; a[k] = (a[k] ?? 0) + 1; return a }, {})

  return (
    <div className="space-y-6">
      <Link href="/admin/messaging/campaigns" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={14} /> Campaigns</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">{campaign.name} <Badge value={campaign.status} /></h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{campaign.channel} · {campaign.category} · created {fmtDate(campaign.created_at)}</p>
          {campaign.pause_reason && <p className="text-sm text-amber-700 mt-1">Paused: {campaign.pause_reason}</p>}
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          {campaign.status === 'draft' && <button onClick={() => act('launch')} disabled={!!busy} className="btn-primary text-sm px-4 py-2">{busy === 'launch' && <Loader2 size={14} className="animate-spin" />} Launch</button>}
          {campaign.status === 'sending' && <button onClick={() => act('pause')} disabled={!!busy} className="btn-secondary text-sm px-4 py-2">Pause</button>}
          {campaign.status === 'paused' && <button onClick={() => act('resume')} disabled={!!busy} className="btn-primary text-sm px-4 py-2">Resume</button>}
          {['draft', 'sending', 'paused'].includes(campaign.status) && <button onClick={() => act('cancel')} disabled={!!busy} className="px-4 py-2 text-sm rounded-xl text-red-600 hover:bg-red-50">Cancel</button>}
          {campaign.status === 'sending' && <DispatchButton onDone={load} />}
        </div>
      </div>

      {notice && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">{notice}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {['queued', 'sent', 'delivered', 'read', 'failed', 'skipped'].map(s => (
          <div key={s} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xl font-bold text-slate-900">{s === 'failed' ? (counts.failed ?? 0) + (counts.bounced ?? 0) + (counts.complained ?? 0) : counts[s] ?? 0}</p>
            <p className="text-xs text-slate-500 capitalize">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 lg:col-span-1 space-y-3 text-sm">
          <h2 className="font-semibold text-slate-900">Content</h2>
          {campaign.channel === 'email' ? (
            <>
              <p><span className="text-slate-500">Subject:</span> {campaign.email_subject}</p>
              <pre className="whitespace-pre-wrap text-xs bg-slate-50 rounded-lg p-3 max-h-64 overflow-auto">{campaign.email_html}</pre>
            </>
          ) : (
            <p><span className="text-slate-500">Template:</span> {campaign.wa_template_name} ({campaign.wa_template_lang}) · params: {campaign.wa_template_params.join(', ') || 'none'}</p>
          )}
          <p><span className="text-slate-500">Audience:</span> {campaign.audience_filter.tags?.length ? `tags ${campaign.audience_filter.tags.join(', ')}` : 'all tags'}{campaign.audience_filter.contact_types?.length ? ` · ${campaign.audience_filter.contact_types.join(', ')}` : ''}</p>
          {Object.keys(skipReasons).length > 0 && (
            <div>
              <p className="text-slate-500 mb-1">Skip / failure reasons</p>
              <ul className="text-xs space-y-0.5">{Object.entries(skipReasons).map(([k, v]) => <li key={k}>{v} × {k.replace(/_/g, ' ')}</li>)}</ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden lg:col-span-2">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase sticky top-0">
                <tr><th className="px-4 py-2">Recipient</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 hidden md:table-cell">Sent</th><th className="px-4 py-2 hidden md:table-cell">Detail</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 1000 && <tr><td colSpan={4} className="px-4 py-2 text-xs text-slate-400">Showing the first 1,000 recipients. Totals above include everyone.</td></tr>}
                {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Launch the campaign to queue recipients.</td></tr>}
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-mono text-xs">{r.to_address}</td>
                    <td className="px-4 py-2"><Badge value={r.status} /></td>
                    <td className="px-4 py-2 hidden md:table-cell text-slate-500">{fmtDate(r.sent_at)}</td>
                    <td className="px-4 py-2 hidden md:table-cell text-xs text-slate-500 truncate max-w-[240px]">{r.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

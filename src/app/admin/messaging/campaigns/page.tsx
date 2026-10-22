'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, MessageCircle, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, Channel, MessageCategory } from '@/lib/messaging/types'
import { Badge, fmtDate } from '../ui'

const EMPTY = {
  name: '', channel: 'email' as Channel, category: 'marketing' as MessageCategory,
  tags: '', contact_types: [] as string[],
  email_subject: '', email_html: '<p>Hi {{first_name}},</p>\n<p></p>', email_text: '',
  wa_template_name: '', wa_template_lang: 'en', wa_template_params: '{{first_name}}',
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('campaigns').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data, error: e }) => { if (e) setError(e.message); setCampaigns((data as Campaign[]) ?? []); setLoading(false) })
  }, [])

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(f => ({ ...f, [k]: v }))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    const isEmail = form.channel === 'email'
    const { data, error: dbErr } = await createClient().from('campaigns').insert({
      name: form.name.trim(), channel: form.channel, category: form.category,
      audience_filter: {
        tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        contact_types: form.contact_types,
      },
      email_subject: isEmail ? form.email_subject : null,
      email_html: isEmail ? form.email_html : null,
      email_text: isEmail && form.email_text.trim() ? form.email_text : null,
      wa_template_name: !isEmail ? form.wa_template_name.trim() : null,
      wa_template_lang: !isEmail ? form.wa_template_lang.trim() || 'en' : null,
      wa_template_params: !isEmail ? form.wa_template_params.split(',').map(p => p.trim()).filter(Boolean) : [],
    }).select().single()
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    router.push(`/admin/messaging/campaigns/${(data as Campaign).id}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">Create a draft, review who&apos;s eligible, then launch. Sending is throttled automatically.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm px-4 py-2"><Plus size={15} /> New campaign</button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

      {showForm && (
        <form onSubmit={create} className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="label text-xs">Campaign name</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Dubai Hills launch: Oct" />
            </div>
            <div>
              <label className="label text-xs">Channel</label>
              <div className="grid grid-cols-2 gap-2">
                {(['email', 'whatsapp'] as Channel[]).map(c => (
                  <button key={c} type="button" onClick={() => set('channel', c)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-sm font-semibold ${form.channel === c ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}>
                    {c === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />} {c === 'email' ? 'Email' : 'WhatsApp'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label text-xs">Type</label>
              <select value={form.category} onChange={e => set('category', e.target.value as MessageCategory)} className="input-field">
                <option value="marketing">Marketing: offers, launches, newsletters (needs consent)</option>
                <option value="utility">Utility: viewing reminders, document requests, updates on an active deal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Audience tags (comma-separated, empty = everyone)</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} className="input-field" placeholder="investors, marina" />
            </div>
            <div>
              <label className="label text-xs">Contact types (empty = all)</label>
              <div className="flex flex-wrap gap-2">
                {['client', 'b2b', 'lead', 'other'].map(t => (
                  <label key={t} className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="checkbox" checked={form.contact_types.includes(t)} className="accent-emerald-700"
                      onChange={e => set('contact_types', e.target.checked ? [...form.contact_types, t] : form.contact_types.filter(x => x !== t))} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {form.channel === 'email' ? (
            <div className="space-y-3">
              <div>
                <label className="label text-xs">Subject</label>
                <input required value={form.email_subject} onChange={e => set('email_subject', e.target.value)} className="input-field" placeholder="{{first_name}}, new 2BR units in Dubai Hills" />
              </div>
              <div>
                <label className="label text-xs">HTML body</label>
                <textarea required rows={8} value={form.email_html} onChange={e => set('email_html', e.target.value)} className="input-field font-mono text-xs" />
              </div>
              <div>
                <label className="label text-xs">Plain-text version (optional, generated from HTML if empty)</label>
                <textarea rows={3} value={form.email_text} onChange={e => set('email_text', e.target.value)} className="input-field font-mono text-xs" />
              </div>
              <p className="text-xs text-slate-500">Variables: {'{{name}} {{first_name}} {{company}} {{unsubscribe_url}}'}. If you leave out an unsubscribe link, one is added with your postal address (Settings → <code>business_postal_address</code>). Avoid ALL-CAPS subjects, lots of links, and URL shorteners: spam filters penalise them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label text-xs">Approved template name</label>
                  <input required value={form.wa_template_name} onChange={e => set('wa_template_name', e.target.value)} className="input-field" placeholder="new_project_launch" />
                </div>
                <div>
                  <label className="label text-xs">Language code</label>
                  <input value={form.wa_template_lang} onChange={e => set('wa_template_lang', e.target.value)} className="input-field" placeholder="en / ar" />
                </div>
                <div>
                  <label className="label text-xs">Body variables in order ({'{{1}}, {{2}}'}…)</label>
                  <input value={form.wa_template_params} onChange={e => set('wa_template_params', e.target.value)} className="input-field" placeholder="{{first_name}}, {{company}}" />
                </div>
              </div>
              <p className="text-xs text-slate-500">WhatsApp only allows business-initiated messages through templates pre-approved in Meta WhatsApp Manager. Add a &quot;Stop promotions&quot; quick-reply button to marketing templates: it lowers block rates, which protects your quality rating.</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
            <button disabled={saving} className="btn-primary text-sm px-4 py-2">{saving && <Loader2 size={14} className="animate-spin" />} Save draft</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : campaigns.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No campaigns yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 hidden md:table-cell">Recipients</th><th className="px-4 py-3 hidden md:table-cell">Created</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/admin/messaging/campaigns/${c.id}`} className="font-medium text-slate-900 hover:text-emerald-700">{c.name}</Link>
                    <span className="ml-2 text-[11px] text-slate-400">{c.category}</span></td>
                  <td className="px-4 py-3 capitalize">{c.channel}</td>
                  <td className="px-4 py-3"><Badge value={c.status} /></td>
                  <td className="px-4 py-3 hidden md:table-cell">{c.total_recipients}{c.skipped_count ? <span className="text-slate-400"> (+{c.skipped_count} skipped)</span> : null}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

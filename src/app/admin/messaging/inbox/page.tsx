'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clock, Loader2, Mail, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isWithinServiceWindow } from '@/lib/messaging/compliance'
import type { AudienceContact, Channel, Message } from '@/lib/messaging/types'
import { Badge, fmtDate } from '../ui'

interface Thread { contact: AudienceContact; last: Message; unreplied: boolean }

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<Map<string, AudienceContact>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [draft, setDraft] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const db = createClient()
    // Threads = contacts who have written to us; campaign blasts alone don't create a thread.
    const { data: inbound, error: e } = await db.from('messages').select('contact_id')
      .eq('direction', 'inbound').not('contact_id', 'is', null).order('created_at', { ascending: false }).limit(1000)
    if (e) { setError(e.message); setLoading(false); return }
    const ids = Array.from(new Set((inbound ?? []).map(r => r.contact_id as string))).slice(0, 200)
    if (!ids.length) { setMessages([]); setLoading(false); return }
    const [m, c] = await Promise.all([
      db.from('messages').select('*').in('contact_id', ids).order('created_at', { ascending: false }).limit(1000),
      db.from('audience_contacts').select('*').in('id', ids),
    ])
    setMessages(((m.data as Message[]) ?? []).reverse())
    setContacts(new Map(((c.data as AudienceContact[]) ?? []).map(x => [x.id, x])))
    setLoading(false)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t) }, [load])

  const threads = useMemo<Thread[]>(() => {
    const byContact = new Map<string, Message[]>()
    for (const m of messages) if (m.contact_id) byContact.set(m.contact_id, [...(byContact.get(m.contact_id) ?? []), m])
    return Array.from(byContact.entries())
      .map(([id, ms]) => ({ contact: contacts.get(id)!, last: ms[ms.length - 1], unreplied: ms[ms.length - 1].direction === 'inbound' }))
      .filter(t => t.contact)
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at))
  }, [messages, contacts])

  const active = threads.find(t => t.contact.id === selected) ?? null
  const thread = useMemo(() => messages.filter(m => m.contact_id === selected), [messages, selected])

  useEffect(() => {
    if (!active) return
    setChannel(active.last.channel)
    setError(null)
  }, [active?.contact.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [thread.length, selected])

  const windowOpen = active ? isWithinServiceWindow(active.contact.last_inbound_whatsapp_at, new Date()) : false
  const canWhatsApp = !!active?.contact.phone
  const canEmail = !!active?.contact.email
  const blocked = channel === 'whatsapp' && !windowOpen

  const send = async () => {
    if (!active || !draft.trim()) return
    setSending(true); setError(null)
    const res = await fetch('/api/messaging/reply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: active.contact.id, channel, body: draft, subject: subject || undefined }),
    })
    const j = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { setError(j.error ?? 'Send failed'); return }
    setDraft(''); setSubject('')
    setMessages(prev => [...prev, j.message as Message])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="text-slate-500 text-sm mt-1">Replies from WhatsApp and email. {threads.filter(t => t.unreplied).length} awaiting response.</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Refresh"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-13rem)] min-h-[480px]">
        <aside className={`border-r border-slate-100 overflow-y-auto ${active ? 'hidden md:block' : ''}`}>
          {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            : threads.length === 0 ? <p className="p-6 text-sm text-slate-500">No conversations yet. Replies to your emails and WhatsApp messages land here once webhooks are connected.</p>
            : threads.map(t => (
              <button key={t.contact.id} onClick={() => setSelected(t.contact.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${selected === t.contact.id ? 'bg-emerald-50' : ''}`}>
                <div className="flex items-center gap-2">
                  {t.last.channel === 'whatsapp' ? <MessageCircle size={13} className="text-[#25D366]" /> : <Mail size={13} className="text-slate-400" />}
                  <span className={`text-sm truncate ${t.unreplied ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{t.contact.name ?? t.contact.email ?? `+${t.contact.phone}`}</span>
                  {t.unreplied && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{t.last.direction === 'outbound' ? 'You: ' : ''}{t.last.body ?? t.last.subject ?? ''}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(t.last.created_at)}</p>
              </button>
            ))}
        </aside>

        <section className={`flex flex-col min-h-0 ${active ? '' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Select a conversation</div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="md:hidden p-1 text-slate-500"><ArrowLeft size={18} /></button>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{active.contact.name ?? '—'}</p>
                  <p className="text-xs text-slate-500 truncate">{[active.contact.email, active.contact.phone && `+${active.contact.phone}`].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <Badge value={active.contact.whatsapp_consent} />
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {thread.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.direction === 'outbound' ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
                      {m.subject && <p className={`text-xs font-semibold mb-1 ${m.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-500'}`}>{m.subject}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body ?? (m.template_name ? `[template: ${m.template_name}]` : '')}</p>
                      <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.direction === 'outbound' ? 'text-emerald-200 justify-end' : 'text-slate-400'}`}>
                        {m.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · {fmtDate(m.created_at)}{m.direction === 'outbound' && ` · ${m.status}`}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <footer className="border-t border-slate-100 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {canWhatsApp && <button onClick={() => setChannel('whatsapp')} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${channel === 'whatsapp' ? 'bg-[#25D366] text-white' : 'bg-slate-100 text-slate-500'}`}>WhatsApp</button>}
                  {canEmail && <button onClick={() => setChannel('email')} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${channel === 'email' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>Email</button>}
                  {channel === 'whatsapp' && (
                    <span className={`ml-auto text-[11px] flex items-center gap-1 ${windowOpen ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <Clock size={12} /> {windowOpen ? '24h reply window open' : 'Reply window closed: use a template campaign'}
                    </span>
                  )}
                </div>
                {channel === 'email' && <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (defaults to Re: their last subject)" className="input-field py-1.5 text-sm" />}
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} disabled={blocked}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
                    placeholder={blocked ? 'WhatsApp only allows free-form replies within 24h of their last message.' : 'Type a reply… (Ctrl+Enter to send)'}
                    className="input-field resize-none text-sm flex-1 disabled:bg-slate-50" />
                  <button onClick={send} disabled={sending || blocked || !draft.trim()} className="btn-primary px-4 self-end py-2.5">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

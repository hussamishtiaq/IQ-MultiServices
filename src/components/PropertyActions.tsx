'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, CheckCircle2, Loader2 } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa6'
import type { Slot } from '@/lib/sales/core'

interface Props {
  propertyId: string
  propertyTitle: string
  whatsappHref: string | null
  whatsappVisitHref: string | null
  alertCriteria: Record<string, unknown>
  alertLabel: string
  canBook: boolean
}

function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={value} onChange={e => onChange(e.target.value)}
    style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />
}

function BookViewing({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ when: string; agent: string | null } | null>(null)

  const load = () => fetch(`/api/viewings?property=${propertyId}`).then(r => r.json()).then(j => {
    if (j.error) { setError(j.error); setSlots([]); return }
    setSlots(j.slots)
    const first = (j.slots as Slot[]).find(s => s.available)
    setDay(d => d ?? first?.date ?? null)
  }).catch(() => { setError('Could not load available times'); setSlots([]) })

  useEffect(() => { load() }, [propertyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from(new Set((slots ?? []).map(s => s.date))), [slots])
  const daySlots = (slots ?? []).filter(s => s.date === day)
  const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slot) { setError('Pick a time'); return }
    setBusy(true); setError(null)
    const res = await fetch('/api/viewings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, scheduled_at: slot, name, phone, email, website: hp }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(j.error ?? 'Booking failed'); setSlot(null); load(); return }
    const s = slots?.find(x => x.iso === slot)
    setDone({ when: s ? `${fmtDay(s.date)}, ${fmtHour(s.hour)}` : '', agent: j.agent })
  }

  if (done) {
    return (
      <div className="text-center py-3" data-testid="viewing-booked">
        <CheckCircle2 size={28} className="mx-auto text-emerald-600 mb-2" />
        <p className="font-semibold text-slate-900">Viewing requested</p>
        <p className="text-sm text-slate-500 mt-1">{done.when} (Dubai time) for {propertyTitle}. {done.agent ? `${done.agent} will` : 'An agent will'} confirm shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Honeypot value={hp} onChange={setHp} />
      {slots === null ? <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={20} /></div> : (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {days.map(d => (
              <button key={d} type="button" onClick={() => { setDay(d); setSlot(null) }}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${day === d ? 'bg-emerald-700 text-white border-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                {fmtDay(d)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {daySlots.map(s => (
              <button key={s.iso} type="button" disabled={!s.available} onClick={() => setSlot(s.iso)}
                className={`py-1.5 rounded-lg text-xs font-medium border ${!s.available ? 'border-slate-100 text-slate-300 line-through cursor-not-allowed' : slot === s.iso ? 'bg-emerald-700 text-white border-emerald-700' : 'border-slate-200 text-slate-700 hover:border-emerald-400'}`}>
                {fmtHour(s.hour)}
              </button>
            ))}
          </div>
        </>
      )}
      <input required value={name} onChange={e => setName(e.target.value)} className="input-field text-sm" placeholder="Full name" aria-label="Full name" />
      <div className="grid grid-cols-2 gap-2">
        <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-field text-sm" placeholder="+971 50…" aria-label="Phone" />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field text-sm" placeholder="Email (optional)" aria-label="Email" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button disabled={busy || !slot} className="btn-primary w-full py-2.5 text-sm">
        {busy && <Loader2 size={14} className="animate-spin" />} Request viewing
      </button>
    </form>
  )
}

function PropertyAlert({ criteria, label }: { criteria: Record<string, unknown>; label: string }) {
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')
  const [contact, setContact] = useState('')
  const [consent, setConsent] = useState(false)
  const [hp, setHp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch('/api/alerts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, consent, criteria, website: hp, ...(channel === 'email' ? { email: contact } : { phone: contact }) }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(j.error ?? 'Could not save alert'); return }
    setDone(true)
  }

  if (done) return <p className="text-sm text-emerald-800 flex items-center gap-2" data-testid="alert-saved"><CheckCircle2 size={16} /> Alert saved. We&apos;ll tell you when a matching property is listed.</p>

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <Honeypot value={hp} onChange={setHp} />
      <p className="text-xs text-slate-500">Get notified when a new <b>{label}</b> is listed.</p>
      <div className="flex gap-2">
        <select value={channel} onChange={e => setChannel(e.target.value as 'email' | 'whatsapp')} className="input-field text-sm w-32" aria-label="Alert channel">
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <input required value={contact} onChange={e => setContact(e.target.value)} type={channel === 'email' ? 'email' : 'tel'}
          placeholder={channel === 'email' ? 'you@example.com' : '+971 50…'} className="input-field text-sm flex-1" aria-label="Alert contact" />
      </div>
      <label className="flex items-start gap-2 text-[11px] text-slate-500 leading-snug">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-emerald-700" />
        Send me matching listings from IQ MultiServices. I can unsubscribe at any time.
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button disabled={busy || !consent} className="btn-secondary w-full py-2 text-sm">{busy && <Loader2 size={14} className="animate-spin" />} Create alert</button>
    </form>
  )
}

export default function PropertyActions(p: Props) {
  const [open, setOpen] = useState<'book' | 'alert' | null>(null)

  useEffect(() => {
    if (p.canBook && new URLSearchParams(window.location.search).get('book') === '1') setOpen('book')
  }, [p.canBook])

  return (
    <div id="book" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3 scroll-mt-24">
      {p.whatsappHref && (
        <a href={p.whatsappHref} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold text-sm transition-colors">
          <FaWhatsapp size={18} /> Ask on WhatsApp
        </a>
      )}
      {p.canBook && (
        <button onClick={() => setOpen(o => o === 'book' ? null : 'book')}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-emerald-700 text-emerald-800 font-semibold text-sm hover:bg-emerald-50">
          <CalendarDays size={16} /> Schedule a visit
        </button>
      )}
      {open === 'book' && (
        <div className="pt-2 border-t border-slate-100">
          <BookViewing propertyId={p.propertyId} propertyTitle={p.propertyTitle} />
          {p.whatsappVisitHref && (
            <a href={p.whatsappVisitHref} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-slate-500 hover:text-emerald-700 mt-3">
              Prefer to arrange it on WhatsApp?
            </a>
          )}
        </div>
      )}
      <button onClick={() => setOpen(o => o === 'alert' ? null : 'alert')}
        className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-slate-500 hover:text-emerald-700 pt-1">
        <Bell size={13} /> Alert me about similar properties
      </button>
      {open === 'alert' && <div className="pt-2 border-t border-slate-100"><PropertyAlert criteria={p.alertCriteria} label={p.alertLabel} /></div>}
    </div>
  )
}

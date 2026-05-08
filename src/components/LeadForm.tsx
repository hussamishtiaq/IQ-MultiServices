'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, MessageCircle, Phone as PhoneIcon, Mail } from 'lucide-react'

interface LeadFormProps {
  propertyId?: string
  projectId?:  string
  areaId?:     string
  source:      string
  defaultMessage?: string
  compact?: boolean
}

const CHANNELS: Array<{ value: 'whatsapp' | 'phone' | 'email'; label: string; Icon: React.ElementType }> = [
  { value: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { value: 'phone',    label: 'Phone',    Icon: PhoneIcon     },
  { value: 'email',    label: 'Email',    Icon: Mail          },
]

export default function LeadForm({
  propertyId, projectId, areaId, source, defaultMessage = '', compact = false,
}: LeadFormProps) {
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState(defaultMessage)
  const [channel, setChannel] = useState<'whatsapp' | 'phone' | 'email'>('whatsapp')
  const [website, setWebsite] = useState('')   // honeypot
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    setLoading(true); setError(null)
    const res = await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId, project_id: projectId, area_id: areaId, source,
        name, phone, email, message, preferred_contact: channel, website,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error ?? 'Could not send. Please try again.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
          <CheckCircle2 size={24} className="text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-900">Thank you, {name.split(' ')[0]}!</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          One of our agents will reach out via {CHANNELS.find(c => c.value === channel)?.label} shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Honeypot — invisible to users, bots fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={e => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
        aria-hidden="true"
      />

      <div>
        <label className="label text-xs">Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)} required
          className="input-field" placeholder="John Smith" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} required
            type="tel"
            className="input-field" placeholder="+971 50 XXX XXXX" />
        </div>
        <div>
          <label className="label text-xs">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            className="input-field" placeholder="optional" />
        </div>
      </div>

      {!compact && (
        <div>
          <label className="label text-xs">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
            className="input-field resize-none" placeholder="I'm interested in this property…" />
        </div>
      )}

      <div>
        <label className="label text-xs">How would you like to be contacted?</label>
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChannel(value)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                channel === value
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button type="submit" disabled={loading}
        className="btn-primary w-full py-3 text-sm">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Get in Touch'}
      </button>

      <p className="text-[10px] text-slate-400 text-center">
        We respect your privacy. Your details are never shared.
      </p>
    </form>
  )
}

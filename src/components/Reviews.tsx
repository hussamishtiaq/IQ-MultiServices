'use client'

import { useState } from 'react'
import { Star, Loader2, CheckCircle2, MessageSquare } from 'lucide-react'
import type { Review } from '@/types'

interface ReviewsProps {
  targetType: 'property' | 'area' | 'agent'
  targetId:   string
  initial:    Review[]
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="p-0.5"
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            size={26}
            className={n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  )
}

export default function Reviews({ targetType, targetId, initial }: ReviewsProps) {
  const [reviews] = useState<Review[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating]   = useState(0)
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1) { setError('Please select a rating.'); return }
    setLoading(true); setError(null)
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: targetType, target_id: targetId,
        rating, title, body, reviewer_name: name, reviewer_email: email, website,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error ?? 'Could not submit. Please try again.')
      return
    }
    setDone(true)
  }

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reviews</h2>
          {reviews.length > 0 && avg != null && (
            <div className="flex items-center gap-2 mt-1">
              <StarRow rating={Math.round(avg)} />
              <span className="text-sm font-bold text-slate-700">{avg.toFixed(1)}</span>
              <span className="text-xs text-slate-400">· {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        {!showForm && !done && (
          <button onClick={() => setShowForm(true)} className="btn-secondary text-sm py-2">
            Write a review
          </button>
        )}
      </div>

      {/* Submission form */}
      {showForm && !done && (
        <form onSubmit={handleSubmit} className="space-y-3 border border-slate-100 rounded-xl p-4 mb-5 bg-slate-50/50">
          <input type="text" name="website" tabIndex={-1} autoComplete="off"
            value={website} onChange={e => setWebsite(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, opacity: 0 }} aria-hidden="true" />

          <div>
            <label className="label text-xs">Your rating *</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name}  onChange={e => setName(e.target.value)}  required
              className="input-field" placeholder="Your name *" />
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="input-field" placeholder="Email (kept private)" />
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="input-field" placeholder="Headline (optional)" maxLength={120} />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
            className="input-field resize-none" placeholder="Share your experience…" maxLength={2000} />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary text-sm">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? 'Submitting…' : 'Submit Review'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(null) }} className="btn-secondary text-sm">Cancel</button>
          </div>
          <p className="text-[11px] text-slate-400">Your review will appear after moderation.</p>
        </form>
      )}

      {done && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-5">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span className="text-sm">Thanks! Your review will be published once approved.</span>
        </div>
      )}

      {/* Existing reviews */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No reviews yet. Be the first.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map(r => (
            <li key={r.id} className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <StarRow rating={r.rating} />
                {r.title && <p className="font-semibold text-slate-900 text-sm">{r.title}</p>}
              </div>
              {r.body && <p className="text-slate-600 text-sm leading-relaxed mb-1.5">{r.body}</p>}
              <p className="text-xs text-slate-400">
                {r.reviewer_name ?? 'Anonymous'} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

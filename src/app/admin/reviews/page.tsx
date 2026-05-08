'use client'

import { useEffect, useState } from 'react'
import { Loader2, Star, Check, X, Trash2, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Review } from '@/types'

const STATUS_COLORS: Record<Review['status'], string> = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-slate-100 text-slate-500',
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </div>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filter, setFilter]   = useState<Review['status'] | 'all'>('pending')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data, error: dbErr } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (dbErr) setError(dbErr.message)
    setReviews((data as Review[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: Review['status']) => {
    setUpdating(id); setError(null)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('reviews').update({ status }).eq('id', id)
    setUpdating(null)
    if (dbErr) { setError(dbErr.message); return }
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return
    setUpdating(id); setError(null)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('reviews').delete().eq('id', id)
    setUpdating(null)
    if (dbErr) { setError(dbErr.message); return }
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter)
  const counts = reviews.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reviews Moderation</h1>
          <p className="text-slate-500 text-sm mt-1">{reviews.length} total · {counts.pending ?? 0} pending</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
          All ({reviews.length})
        </button>
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === s ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
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
          <p className="font-semibold text-slate-600 mb-1">No reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <StarRow rating={r.rating} />
                    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                    <span className="text-xs text-slate-400">{r.target_type}</span>
                  </div>
                  {r.title && <p className="font-semibold text-slate-900">{r.title}</p>}
                  {r.body && <p className="text-sm text-slate-600 leading-relaxed mt-1">{r.body}</p>}
                  <p className="text-xs text-slate-400 mt-2">
                    {r.reviewer_name ?? 'Anonymous'}
                    {r.reviewer_email && ` · ${r.reviewer_email}`}
                    {' · '}{new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.status !== 'approved' && (
                    <button onClick={() => setStatus(r.id, 'approved')} disabled={updating === r.id}
                      className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" title="Approve">
                      <Check size={16} />
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => setStatus(r.id, 'rejected')} disabled={updating === r.id}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50" title="Reject">
                      <X size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(r.id)} disabled={updating === r.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50" title="Delete">
                    {updating === r.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

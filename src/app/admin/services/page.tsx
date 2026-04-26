'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Loader2, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/types'

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('services').select('*').order('order', { ascending: true })
    setServices((data as Service[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('services').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500 text-sm mt-1">{services.length} service{services.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/services/new" className="btn-primary text-sm py-2">
          <Plus size={16} /> Add Service
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600 mb-1">No services yet</p>
          <p className="text-slate-400 text-sm mb-6">Add your first service to display on the website</p>
          <Link href="/admin/services/new" className="btn-primary text-sm">
            <Plus size={16} /> Add Service
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {s.icon || '⚡'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{s.title}</p>
                  {s.description && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{s.description}</p>
                  )}
                  <span className="inline-block mt-2 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">
                    Order: {s.order}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <Link href={`/admin/services/${s.id}/edit`}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  <Edit size={15} />
                </Link>
                <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                  {deleting === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Trash2, Star, MapPin, Loader2, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/types'

const statusClass: Record<Property['status'], string> = {
  available: 'badge-available',
  sold:      'badge-sold',
  rented:    'badge-rented',
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [deleting, setDeleting]     = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    setProperties((data as Property[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this property? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('properties').delete().eq('id', id)
    setProperties(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-500 text-sm mt-1">{properties.length} listing{properties.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/properties/new" className="btn-primary text-sm py-2">
          <Plus size={16} /> Add Property
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Home size={28} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600 mb-1">No properties yet</p>
          <p className="text-slate-400 text-sm mb-6">Add your first property listing to get started</p>
          <Link href="/admin/properties/new" className="btn-primary text-sm">
            <Plus size={16} /> Add Property
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Property</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden sm:table-cell">Location</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">Price</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {properties.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt={p.title} fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-medium">IMG</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 line-clamp-1">{p.title}</span>
                            {p.featured && <Star size={12} className="text-amber-500 flex-shrink-0" fill="currentColor" />}
                          </div>
                          <span className="text-xs text-slate-400 capitalize">{p.type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {p.location ? (
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <MapPin size={12} className="text-slate-400" />
                          {p.location}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {p.price != null ? (
                        <span className="font-semibold text-emerald-700">${p.price.toLocaleString()}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={statusClass[p.status]}>{p.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/properties/${p.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <Edit size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {deleting === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

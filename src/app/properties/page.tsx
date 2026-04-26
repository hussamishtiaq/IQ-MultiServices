import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PropertyCard from '@/components/PropertyCard'
import { createClient } from '@/lib/supabase/server'
import { Building2, ChevronRight } from 'lucide-react'
import type { Property } from '@/types'

const TYPES   = ['all', 'apartment', 'villa', 'commercial', 'land', 'office'] as const
const STATUSES = ['all', 'available', 'sold', 'rented'] as const

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; q?: string }
}) {
  const supabase = createClient()
  let query = supabase.from('properties').select('*').order('created_at', { ascending: false })

  if (searchParams.type && searchParams.type !== 'all') {
    query = query.eq('type', searchParams.type)
  }
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.q) {
    query = query.ilike('title', `%${searchParams.q}%`)
  }

  const { data } = await query
  const properties = (data as Property[]) ?? []

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">Properties</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Browse Properties</h1>
            <p className="mt-2 text-emerald-200 text-lg">Find your perfect property from our listings</p>
          </div>
        </div>

        <div className="container-main py-8">
          {/* Filters */}
          <form className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-8 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="label">Search</label>
              <input
                name="q"
                defaultValue={searchParams.q}
                placeholder="Search by title…"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="type" defaultValue={searchParams.type ?? 'all'} className="input-field pr-8">
                {TYPES.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={searchParams.status ?? 'all'} className="input-field pr-8">
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary py-2.5">Filter</button>
          </form>

          {/* Results */}
          {properties.length > 0 ? (
            <>
              <p className="text-sm text-slate-500 mb-5">{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Building2 size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-slate-500">No properties found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

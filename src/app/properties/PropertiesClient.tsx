'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PropertyCard from '@/components/PropertyCard'
import { Building2, Search, SlidersHorizontal, Loader2 } from 'lucide-react'
import type { Property, Area } from '@/types'

const TYPES    = ['all', 'apartment', 'villa', 'commercial', 'land', 'office'] as const
const STATUSES = ['all', 'available', 'sold', 'rented'] as const
const LISTINGS = ['all', 'sale', 'rent'] as const
const COMPLETIONS = ['all', 'ready', 'off_plan', 'resale'] as const
const BEDS = ['any', '0', '1', '2', '3', '4', '5'] as const

interface PageResponse {
  data: Property[]
  total: number | null
  page: number
  hasMore: boolean
}

interface Filters {
  type: string
  status: string
  listing: string
  completion: string
  area: string
  beds: string
  q: string
}

async function fetchProperties(args: { pageParam?: number } & Filters): Promise<PageResponse> {
  const { pageParam = 1, type, status, listing, completion, area, beds, q } = args
  const params = new URLSearchParams({ page: String(pageParam) })
  if (type       && type       !== 'all') params.set('type',       type)
  if (status     && status     !== 'all') params.set('status',     status)
  if (listing    && listing    !== 'all') params.set('listing',    listing)
  if (completion && completion !== 'all') params.set('completion', completion)
  if (area)                               params.set('area',       area)
  if (beds       && beds       !== 'any') params.set('beds',       beds)
  if (q.trim())                           params.set('q',          q.trim())
  const res = await fetch(`/api/properties?${params}`)
  if (!res.ok) throw new Error('Failed to fetch properties')
  return res.json()
}

export default function PropertiesClient({
  initialData,
  areas,
}: {
  initialData: PageResponse
  areas: Area[]
}) {
  const sp = useSearchParams()

  // Initial state from URL
  const [type,       setType]       = useState(sp.get('type')       ?? 'all')
  const [status,     setStatus]     = useState(sp.get('status')     ?? 'all')
  const [listing,    setListing]    = useState(sp.get('listing')    ?? 'all')
  const [completion, setCompletion] = useState(sp.get('completion') ?? 'all')
  const [area,       setArea]       = useState(sp.get('area')       ?? '')
  const [beds,       setBeds]       = useState(sp.get('beds')       ?? 'any')
  const [q,          setQ]          = useState(sp.get('q')          ?? '')
  const [search,     setSearch]     = useState(sp.get('q')          ?? '')

  const loaderRef = useRef<HTMLDivElement>(null)

  const filters: Filters = { type, status, listing, completion, area, beds, q: search }

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError,
  } = useInfiniteQuery({
    queryKey:         ['properties', filters],
    queryFn:          ({ pageParam }) => fetchProperties({ pageParam, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    initialData:
      type === 'all' && status === 'all' && listing === 'all' && completion === 'all'
        && !area && beds === 'any' && !search
        ? { pages: [initialData], pageParams: [1] }
        : undefined,
  })

  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onIntersect])

  const allProperties = data?.pages.flatMap(p => p.data) ?? []
  const total         = data?.pages[0]?.total ?? null

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(q)
  }

  const filtersDirty =
    type !== 'all' || status !== 'all' || listing !== 'all' || completion !== 'all'
    || !!area || beds !== 'any' || !!search

  const clearAll = () => {
    setType('all'); setStatus('all'); setListing('all'); setCompletion('all')
    setArea(''); setBeds('any'); setQ(''); setSearch('')
  }

  return (
    <div className="container-main py-8">
      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={15} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <form onSubmit={handleSearch} className="flex-1 min-w-[180px] flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by title…"
                className="input-field pl-9"
              />
            </div>
            <button type="submit" className="btn-primary py-2.5 px-4 text-sm">Search</button>
          </form>

          <div className="min-w-[120px]">
            <label className="label">Listing</label>
            <select value={listing} onChange={e => setListing(e.target.value)} className="input-field">
              {LISTINGS.map(l => (
                <option key={l} value={l}>
                  {l === 'all' ? 'Sale & Rent' : l === 'sale' ? 'For Sale' : 'For Rent'}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="label">Status</label>
            <select value={completion} onChange={e => setCompletion(e.target.value)} className="input-field">
              {COMPLETIONS.map(c => (
                <option key={c} value={c}>
                  {c === 'all' ? 'Ready & Off-plan' : c === 'off_plan' ? 'Off-plan' : c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="label">Area</label>
            <select value={area} onChange={e => setArea(e.target.value)} className="input-field">
              <option value="">All Areas</option>
              {areas.map(a => (
                <option key={a.id} value={a.slug}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[100px]">
            <label className="label">Beds</label>
            <select value={beds} onChange={e => setBeds(e.target.value)} className="input-field">
              {BEDS.map(b => (
                <option key={b} value={b}>
                  {b === 'any' ? 'Any' : b === '0' ? 'Studio' : `${b}+`}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="label">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input-field">
              {TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[120px]">
            <label className="label">Availability</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
              {STATUSES.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {filtersDirty && (
            <button type="button" onClick={clearAll}
              className="text-sm text-slate-400 hover:text-red-500 transition-colors pb-0.5">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && total != null && (
        <p className="text-sm text-slate-500 mb-5">
          {total} propert{total !== 1 ? 'ies' : 'y'} found
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-red-400">
          <p className="font-medium">Failed to load properties. Please try again.</p>
        </div>
      )}

      {!isLoading && allProperties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProperties.map((p, idx) => (
            <PropertyCard key={p.id} property={p} priority={idx < 3} />
          ))}
        </div>
      )}

      {!isLoading && !isError && allProperties.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Building2 size={56} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">No properties found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      <div ref={loaderRef} className="h-10 flex items-center justify-center mt-6">
        {isFetchingNextPage && <Loader2 size={24} className="animate-spin text-emerald-600" />}
        {!hasNextPage && allProperties.length > 0 && (
          <p className="text-sm text-slate-400">All properties loaded</p>
        )}
      </div>
    </div>
  )
}

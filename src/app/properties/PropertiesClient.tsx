'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PropertyCard from '@/components/PropertyCard'
import { Building2, Search, SlidersHorizontal, Loader2, ChevronDown } from 'lucide-react'
import type { Property, Area, StudioType } from '@/types'

const TYPES       = ['all', 'apartment', 'villa', 'commercial', 'land', 'office'] as const
const STATUSES    = ['all', 'available', 'sold', 'rented'] as const
const LISTINGS    = ['all', 'sale', 'rent'] as const
const COMPLETIONS = ['all', 'ready', 'off_plan', 'resale'] as const
const BED_PILLS   = ['any', '0', '1', '2', '3', '4', '5+'] as const

const STUDIO_TYPES: { value: StudioType; label: string; hint: string }[] = [
  { value: 'standard',    label: 'Standard',    hint: 'Simple open layout'         },
  { value: 'alcove',      label: 'Alcove',       hint: 'Private sleeping nook'      },
  { value: 'convertible', label: 'Convertible',  hint: 'Space to add a divider'     },
  { value: 'loft',        label: 'Loft',         hint: 'High ceilings / mezzanine'  },
  { value: 'micro',       label: 'Micro',        hint: 'Ultra-compact layout'       },
]

interface PageResponse {
  data: Property[]
  total: number | null
  page: number
  hasMore: boolean
}

interface Filters {
  type: string; status: string; listing: string; completion: string
  area: string; beds: string; studioType: string; q: string
}

async function fetchProperties(args: { pageParam?: number } & Filters): Promise<PageResponse> {
  const { pageParam = 1, type, status, listing, completion, area, beds, studioType, q } = args
  const params = new URLSearchParams({ page: String(pageParam) })
  if (type       && type       !== 'all') params.set('type',        type)
  if (status     && status     !== 'all') params.set('status',      status)
  if (listing    && listing    !== 'all') params.set('listing',     listing)
  if (completion && completion !== 'all') params.set('completion',  completion)
  if (area)                               params.set('area',        area)
  if (beds && beds !== 'any')             params.set('beds',        beds === '5+' ? '5' : beds)
  if (studioType)                         params.set('studio_type', studioType)
  if (q.trim())                           params.set('q',           q.trim())
  const res = await fetch(`/api/properties?${params}`)
  if (!res.ok) throw new Error('Failed to fetch properties')
  return res.json()
}

function BedPill({ value, selected, onClick }: {
  value: string; selected: boolean; onClick: () => void
}) {
  const label = value === 'any' ? 'Any'
    : value === '0' ? 'Studio'
    : `${value} bed${value === '1' ? '' : 's'}`
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
        selected
          ? 'bg-emerald-800 text-white border-emerald-800'
          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
      }`}>
      {label}
    </button>
  )
}

function StudioPill({ item, selected, onClick }: {
  item: typeof STUDIO_TYPES[number]; selected: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} title={item.hint}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
        selected
          ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
      }`}>
      {item.label}
      <span className="hidden sm:inline text-slate-400 font-normal"> · {item.hint}</span>
    </button>
  )
}

export default function PropertiesClient({
  initialData,
  areas,
}: {
  initialData: PageResponse
  areas: Area[]
}) {
  const sp = useSearchParams()

  const [type,         setType]         = useState(sp.get('type')         ?? 'all')
  const [status,       setStatus]       = useState(sp.get('status')       ?? 'all')
  const [listing,      setListing]      = useState(sp.get('listing')      ?? 'all')
  const [completion,   setCompletion]   = useState(sp.get('completion')   ?? 'all')
  const [area,         setArea]         = useState(sp.get('area')         ?? '')
  const [beds,         setBeds]         = useState(sp.get('beds')         ?? 'any')
  const [studioType,   setStudioType]   = useState(sp.get('studio_type')  ?? '')
  const [q,            setQ]            = useState(sp.get('q')            ?? '')
  const [search,       setSearch]       = useState(sp.get('q')            ?? '')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const loaderRef = useRef<HTMLDivElement>(null)

  const handleBedChange = (val: string) => {
    setBeds(val)
    if (val !== '0') setStudioType('')
  }

  const filters: Filters = { type, status, listing, completion, area, beds, studioType, q: search }

  const isDefaultFilter =
    type === 'all' && status === 'all' && listing === 'all' && completion === 'all'
    && !area && beds === 'any' && !studioType && !search

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey:         ['properties', filters],
      queryFn:          ({ pageParam }) => fetchProperties({ pageParam, ...filters }),
      initialPageParam: 1,
      getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
      initialData: isDefaultFilter
        ? { pages: [initialData], pageParams: [1] }
        : undefined,
    })

  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
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
  const filtersDirty  = !isDefaultFilter

  const clearAll = () => {
    setType('all'); setStatus('all'); setListing('all'); setCompletion('all')
    setArea(''); setBeds('any'); setStudioType(''); setQ(''); setSearch('')
  }

  return (
    <div className="container-main py-8">
      {/* ── Filter panel ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-8">

        {/* Search */}
        <form onSubmit={e => { e.preventDefault(); setSearch(q) }} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search by title, area…" className="input-field pl-9" />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-5 text-sm">Search</button>
        </form>

        {/* Sale / Rent pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {LISTINGS.map(l => (
            <button key={l} type="button" onClick={() => setListing(l)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                listing === l
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
              }`}>
              {l === 'all' ? 'Sale & Rent' : l === 'sale' ? 'For Sale' : 'For Rent'}
            </button>
          ))}
        </div>

        {/* Bedroom pills */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bedrooms</p>
          <div className="flex flex-wrap gap-2">
            {BED_PILLS.map(b => (
              <BedPill key={b} value={b} selected={beds === b} onClick={() => handleBedChange(b)} />
            ))}
          </div>
        </div>

        {/* Studio layout sub-filter — appears when Studio pill is active */}
        {beds === '0' && (
          <div className="mt-3 pl-3 border-l-2 border-emerald-200">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
              Studio Layout
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStudioType('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  studioType === ''
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                }`}>
                All layouts
              </button>
              {STUDIO_TYPES.map(item => (
                <StudioPill key={item.value} item={item}
                  selected={studioType === item.value}
                  onClick={() => setStudioType(studioType === item.value ? '' : item.value)} />
              ))}
            </div>
          </div>
        )}

        {/* More filters toggle */}
        <button type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
          <SlidersHorizontal size={13} />
          More filters
          <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Area</label>
              <select value={area} onChange={e => setArea(e.target.value)} className="input-field">
                <option value="">All Areas</option>
                {areas.map(a => <option key={a.id} value={a.slug}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Completion</label>
              <select value={completion} onChange={e => setCompletion(e.target.value)} className="input-field">
                {COMPLETIONS.map(c => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'Ready & Off-plan'
                      : c === 'off_plan' ? 'Off-plan'
                      : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Property Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input-field">
                {TYPES.map(t => (
                  <option key={t} value={t}>
                    {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Availability</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {filtersDirty && (
          <button type="button" onClick={clearAll}
            className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors">
            Clear all filters
          </button>
        )}
      </div>

      {/* Results summary */}
      {!isLoading && total != null && (
        <p className="text-sm text-slate-500 mb-5">
          {total} propert{total !== 1 ? 'ies' : 'y'} found
          {beds === '0' && studioType && (
            <span className="ml-1.5 text-emerald-700 font-medium capitalize">
              · {studioType} studio
            </span>
          )}
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

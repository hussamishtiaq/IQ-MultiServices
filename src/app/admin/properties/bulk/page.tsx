'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Plus, Upload, Download, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Area, ListingType, CompletionStatus, Currency } from '@/types'

// RevoGrid uses web components; load only on client
const RevoGrid = dynamic(() => import('@revolist/react-datagrid').then(m => m.RevoGrid), { ssr: false }) as any

type Row = {
  id?:                string
  title:              string
  area_slug:          string
  listing_type:       ListingType | ''
  completion_status:  CompletionStatus | ''
  type:               string
  bedrooms:           number | string | ''
  bathrooms:          number | string | ''
  area:               number | string | ''
  price:              number | string | ''
  currency:           Currency | ''
  status:             string
  furnishing:         string
  featured:           boolean | string
  location:           string
  description:        string
  _error?:            string  // per-row server error
}

const emptyRow = (): Row => ({
  title: '', area_slug: '', listing_type: 'sale', completion_status: 'ready',
  type: 'apartment', bedrooms: '', bathrooms: '', area: '', price: '',
  currency: 'AED', status: 'available', furnishing: '', featured: false,
  location: '', description: '',
})

const COLUMNS = [
  { prop: 'title',             name: 'Title',          size: 220 },
  { prop: 'area_slug',         name: 'Area (slug)',    size: 150 },
  { prop: 'listing_type',      name: 'Listing',        size: 90  },
  { prop: 'completion_status', name: 'Completion',     size: 100 },
  { prop: 'type',              name: 'Type',           size: 110 },
  { prop: 'bedrooms',          name: 'Beds',           size: 70  },
  { prop: 'bathrooms',         name: 'Baths',          size: 70  },
  { prop: 'area',              name: 'Area (m²)',      size: 80  },
  { prop: 'price',             name: 'Price',          size: 110 },
  { prop: 'currency',          name: 'Curr.',          size: 70  },
  { prop: 'status',            name: 'Status',         size: 100 },
  { prop: 'furnishing',        name: 'Furnishing',     size: 110 },
  { prop: 'featured',          name: 'Featured',       size: 80  },
  { prop: 'location',          name: 'Location',       size: 140 },
  { prop: 'description',       name: 'Description',    size: 240 },
]

// Map area_slug → id from the loaded areas
function buildAreaMap(areas: Area[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const a of areas) m.set(a.slug, a.id)
  return m
}

function parseCSV(text: string): Row[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (!lines.length) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ; continue }
      if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue }
      cur += c
    }
    cells.push(cur)
    const row = emptyRow() as unknown as Record<string, unknown>
    headers.forEach((h, i) => {
      const v = (cells[i] ?? '').trim()
      if (h in row) (row as Record<string, unknown>)[h] = v
    })
    return row as unknown as Row
  })
}

function rowsToCSV(rows: Row[]): string {
  const headers = COLUMNS.map(c => c.prop)
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map(h => escape((r as unknown as Record<string, unknown>)[h])).join(','))
  }
  return lines.join('\n')
}

export default function BulkEditorPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('areas').select('*').order('display_order', { ascending: true })
      .then(({ data }) => {
        setAreas((data as Area[]) ?? [])
        setLoading(false)
      })
  }, [])

  const areaMap = useMemo(() => buildAreaMap(areas), [areas])

  const addRow = () => setRows(r => [...r, emptyRow()])
  const addManyRows = (n = 10) => setRows(r => [...r, ...Array.from({ length: n }, emptyRow)])

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result ?? ''))
      setRows(r => [...r, ...parsed])
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleExport = () => {
    const csv = rowsToCSV(rows.length ? rows : [emptyRow()])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `properties-template-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    setError(null); setSavedMsg(null)
    if (!rows.length) return

    // Validate + map
    const valid: Array<Record<string, unknown>> = []
    const errors: Array<{ idx: number; msg: string }> = []

    rows.forEach((r, idx) => {
      if (!r.title?.toString().trim()) {
        errors.push({ idx, msg: 'Title required' }); return
      }
      let area_id: string | null = null
      if (r.area_slug?.toString().trim()) {
        const id = areaMap.get(r.area_slug.toString().trim())
        if (!id) { errors.push({ idx, msg: `Unknown area "${r.area_slug}"` }); return }
        area_id = id
      }
      const num = (v: unknown) => v === '' || v == null ? null : Number(v)
      const featured = String(r.featured).toLowerCase() === 'true' || r.featured === true
      valid.push({
        title:              String(r.title).trim(),
        description:        r.description?.toString().trim() || null,
        price:              num(r.price),
        currency:           r.currency || 'AED',
        location:           r.location?.toString().trim() || null,
        area_id,
        listing_type:       r.listing_type      || 'sale',
        completion_status:  r.completion_status || 'ready',
        type:               r.type              || 'apartment',
        bedrooms:           num(r.bedrooms),
        bathrooms:          num(r.bathrooms),
        area:               num(r.area),
        status:             r.status            || 'available',
        furnishing:         r.furnishing        || null,
        featured,
      })
    })

    if (errors.length) {
      setError(`${errors.length} row${errors.length > 1 ? 's have' : ' has'} errors. First: row ${errors[0].idx + 1} — ${errors[0].msg}`)
      // Tag rows with errors
      setRows(prev => prev.map((r, i) => {
        const e = errors.find(e => e.idx === i)
        return { ...r, _error: e?.msg }
      }))
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: dbErr, data } = await supabase.from('properties').insert(valid).select('id')
    setSaving(false)
    if (dbErr) { setError(`Insert failed: ${dbErr.message}`); return }
    setSavedMsg(`Saved ${data?.length ?? valid.length} propert${data?.length === 1 ? 'y' : 'ies'}.`)
    setRows([])
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/properties" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Bulk Property Editor</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Excel-style entry. Paste rows directly, or import from CSV.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => addRow()} className="btn-secondary text-xs py-2 px-3"><Plus size={14} /> Add row</button>
        <button onClick={() => addManyRows(10)} className="btn-secondary text-xs py-2 px-3"><Plus size={14} /> +10 rows</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-2 px-3"><Upload size={14} /> Import CSV</button>
        <button onClick={handleExport} className="btn-secondary text-xs py-2 px-3"><Download size={14} /> Download template</button>
        <div className="flex-1" />
        {rows.length > 0 && (
          <button onClick={() => { if (confirm('Discard all unsaved rows?')) setRows([]) }}
            className="text-xs text-red-500 hover:text-red-600 font-semibold py-2 px-3">
            <Trash2 size={14} className="inline mr-1" /> Discard
          </button>
        )}
        <button onClick={handleSave} disabled={saving || rows.length === 0} className="btn-primary text-xs py-2 px-4">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : `Save ${rows.length} row${rows.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-3 flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {savedMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-3">
          {savedMsg}
        </div>
      )}

      {/* Helper */}
      <details className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">Column reference & accepted values</summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-600">
          <p><b>title</b> *required</p>
          <p><b>area_slug</b> — must match an existing area: {areas.map(a => a.slug).slice(0, 5).join(', ')}…</p>
          <p><b>listing_type</b> — sale | rent</p>
          <p><b>completion_status</b> — ready | off_plan | resale</p>
          <p><b>type</b> — apartment | villa | commercial | land | office</p>
          <p><b>bedrooms / bathrooms</b> — integer</p>
          <p><b>area</b> — number (m²)</p>
          <p><b>price</b> — number</p>
          <p><b>currency</b> — AED | USD</p>
          <p><b>status</b> — available | sold | rented</p>
          <p><b>furnishing</b> — furnished | semi_furnished | unfurnished</p>
          <p><b>featured</b> — true | false</p>
        </div>
      </details>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="font-semibold text-slate-600 mb-1">No rows yet</p>
          <p className="text-slate-400 text-sm mb-5">Add a row, paste from Excel, or import a CSV to get started.</p>
          <button onClick={() => addManyRows(10)} className="btn-primary text-sm">
            <Plus size={14} /> Add 10 rows
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div style={{ height: 600 }}>
            <RevoGrid
              theme="material"
              source={rows}
              columns={COLUMNS}
              range
              resize
              canFocus
              autoSizeColumn
              onAfterEdit={(e: { detail: { rowIndex: number; prop: string; val: unknown } }) => {
                setRows(prev => {
                  const next = [...prev]
                  const r = { ...next[e.detail.rowIndex] } as unknown as Record<string, unknown>
                  r[e.detail.prop] = e.detail.val
                  next[e.detail.rowIndex] = r as unknown as Row
                  return next
                })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

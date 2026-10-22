'use client'

import { AlertTriangle, ShieldCheck } from 'lucide-react'

export interface ComplianceValues { permit_number: string; agent_name: string; agent_brn: string }

export default function ListingComplianceFields({ value, onChange, listingActive }: {
  value: ComplianceValues
  onChange: (key: keyof ComplianceValues, v: string) => void
  listingActive: boolean
}) {
  const missing = listingActive && !value.permit_number.trim()
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={16} className="text-emerald-700" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">RERA / DLD compliance</h2>
          <p className="text-xs text-slate-500">Dubai requires a Trakheesi permit for every advertised listing (fines up to AED 50,000).</p>
        </div>
      </div>
      {missing && (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          No permit number. Get one through Trakheesi (signed Form A from the owner) before advertising this listing publicly.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Trakheesi permit no.</label>
          <input value={value.permit_number} onChange={e => onChange('permit_number', e.target.value)} className="input-field" placeholder="e.g. 7123456789" />
        </div>
        <div>
          <label className="label">Listing agent</label>
          <input value={value.agent_name} onChange={e => onChange('agent_name', e.target.value)} className="input-field" placeholder="Agent full name" />
        </div>
        <div>
          <label className="label">Agent BRN</label>
          <input value={value.agent_brn} onChange={e => onChange('agent_brn', e.target.value)} className="input-field" placeholder="RERA broker no." />
        </div>
      </div>
    </div>
  )
}

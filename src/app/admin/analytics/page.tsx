'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import {
  TrendingUp, Eye, MessageSquare, CheckCircle2, Loader2,
  Building2, Briefcase, MapPin, Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface KPI {
  total_views: number
  unique_visitors: number
  total_leads: number
  converted_leads: number
  view_to_lead_rate_pct: number
  lead_to_conversion_rate_pct: number
}

interface ViewsByArea  { area_name: string; area_slug: string; views: number }
interface ViewsByType  { type: string; views: number }
interface ListingByStatus { listing_type: string; status: string; count: number }
interface LeadsDaily   { day: string; leads: number; area_name: string | null }
interface LeadsByCompletion { completion_status: string; leads: number }
interface TopProperty  { id: string; title: string; area_name: string | null; views: number }

const COLORS = ['#047857', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#FBBF24', '#F59E0B', '#3B82F6', '#A78BFA', '#F472B6']

function KpiTile({ label, value, sub, Icon, color }: {
  label: string; value: string | number; sub?: string; Icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} mb-3`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-72">
        {children}
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi]                 = useState<KPI | null>(null)
  const [viewsByArea, setViewsByArea] = useState<ViewsByArea[]>([])
  const [viewsByType, setViewsByType] = useState<ViewsByType[]>([])
  const [listingsByStatus, setListingsByStatus] = useState<ListingByStatus[]>([])
  const [leadsDaily, setLeadsDaily]   = useState<LeadsDaily[]>([])
  const [leadsByCompletion, setLeadsByCompletion] = useState<LeadsByCompletion[]>([])
  const [topProperties, setTopProperties] = useState<TopProperty[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [k, va, vt, ls, ld, lc, tp] = await Promise.all([
        supabase.from('v_kpi_30d').select('*').single(),
        supabase.from('v_views_by_area_30d').select('*').limit(10),
        supabase.from('v_views_by_type_30d').select('*'),
        supabase.from('v_listings_by_status').select('*'),
        supabase.from('v_leads_daily_90d').select('*'),
        supabase.from('v_leads_by_completion_90d').select('*'),
        supabase.from('v_top_properties_30d').select('*'),
      ])
      setKpi(k.data as KPI | null)
      setViewsByArea((va.data as ViewsByArea[]) ?? [])
      setViewsByType((vt.data as ViewsByType[]) ?? [])
      setListingsByStatus((ls.data as ListingByStatus[]) ?? [])
      setLeadsDaily((ld.data as LeadsDaily[]) ?? [])
      setLeadsByCompletion((lc.data as LeadsByCompletion[]) ?? [])
      setTopProperties((tp.data as TopProperty[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Listing by status: aggregate to a horizontal-stacked-bar friendly shape
  const statusData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const r of listingsByStatus) {
      const key = r.listing_type
      map[key] ??= { available: 0, sold: 0, rented: 0 }
      map[key][r.status] = r.count
    }
    return Object.entries(map).map(([listing_type, counts]) => ({
      listing_type: listing_type === 'sale' ? 'For Sale' : 'For Rent',
      ...counts,
    }))
  }, [listingsByStatus])

  // Leads daily: aggregate across areas to a single time series for now
  const leadsDailyAgg = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of leadsDaily) {
      map[r.day] = (map[r.day] ?? 0) + Number(r.leads)
    }
    return Object.entries(map).map(([day, leads]) => ({ day, leads })).sort((a, b) => a.day.localeCompare(b.day))
  }, [leadsDaily])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Last 30 days</p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Total page views"    value={kpi?.total_views ?? 0}        sub={`${kpi?.unique_visitors ?? 0} unique visitors`} Icon={Eye}         color="bg-emerald-700" />
        <KpiTile label="Leads generated"     value={kpi?.total_leads ?? 0}        Icon={MessageSquare} color="bg-amber-500" />
        <KpiTile label="View → lead rate"    value={`${kpi?.view_to_lead_rate_pct ?? 0}%`}            Icon={TrendingUp}   color="bg-blue-600" />
        <KpiTile label="Lead → conversion"   value={`${kpi?.lead_to_conversion_rate_pct ?? 0}%`} sub={`${kpi?.converted_leads ?? 0} converted`} Icon={CheckCircle2} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Views by area */}
        <ChartCard title="Most-viewed areas" subtitle="Top 10, last 30 days">
          {viewsByArea.length === 0 ? (
            <EmptyState icon={MapPin} text="No view data yet. Visit a property page to start collecting." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsByArea} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="area_name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="views" fill="#047857" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Views by type */}
        <ChartCard title="Property types viewed" subtitle="Last 30 days">
          {viewsByType.length === 0 ? (
            <EmptyState icon={Building2} text="No view data yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={viewsByType} dataKey="views" nameKey="type" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {viewsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Listings by status */}
        <ChartCard title="Listings by status" subtitle="Stacked: available · sold · rented">
          {statusData.length === 0 ? (
            <EmptyState icon={Briefcase} text="No properties yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="listing_type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="available" stackId="a" fill="#10B981" />
                <Bar dataKey="sold"      stackId="a" fill="#EF4444" />
                <Bar dataKey="rented"    stackId="a" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Leads daily 90d */}
        <ChartCard title="Leads per day" subtitle="Last 90 days">
          {leadsDailyAgg.length === 0 ? (
            <EmptyState icon={MessageSquare} text="No leads yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsDailyAgg} margin={{ top: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#047857" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Off-plan vs ready leads */}
        <ChartCard title="Leads: off-plan vs ready" subtitle="Last 90 days">
          {leadsByCompletion.length === 0 ? (
            <EmptyState icon={MessageSquare} text="No leads yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadsByCompletion} dataKey="leads" nameKey="completion_status" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {leadsByCompletion.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top properties */}
        <ChartCard title="Top 10 properties by views" subtitle="Last 30 days">
          {topProperties.length === 0 ? (
            <EmptyState icon={Award} text="No view data yet." />
          ) : (
            <div className="overflow-y-auto h-full -mx-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {topProperties.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-2 py-2.5 w-8 text-slate-400 font-bold">#{i + 1}</td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-slate-800 line-clamp-1">{p.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.area_name ?? '—'}</p>
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold text-emerald-700">{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400">
      <Icon size={32} className="mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

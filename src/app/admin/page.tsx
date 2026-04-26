import Link from 'next/link'
import { Home, Briefcase, Phone, Plus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard | IQ Admin' }

async function getStats() {
  const supabase = createClient()
  const [p, s, c] = await Promise.all([
    supabase.from('properties').select('id', { count: 'exact', head: true }),
    supabase.from('services').select('id',   { count: 'exact', head: true }),
    supabase.from('contacts').select('id',   { count: 'exact', head: true }),
  ])
  return { properties: p.count ?? 0, services: s.count ?? 0, contacts: c.count ?? 0 }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}


export default async function AdminDashboard() {
  const stats = await getStats()

  const statCards = [
    { label: 'Total Properties', value: stats.properties, icon: Home,     href: '/admin/properties', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { label: 'Services Listed',  value: stats.services,   icon: Briefcase, href: '/admin/services',   bg: 'bg-teal-50',    text: 'text-teal-700'    },
    { label: 'Contact Methods',  value: stats.contacts,   icon: Phone,     href: '/admin/contacts',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  ]

  const quickActions = [
    { label: 'Add Property', href: '/admin/properties/new', icon: Home     },
    { label: 'Add Service',  href: '/admin/services/new',   icon: Briefcase },
    { label: 'Contacts',     href: '/admin/contacts',       icon: Phone    },
  ]

  return (
    <div>
      {/* ── Welcome banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-950 to-emerald-800 p-6 sm:p-8 text-white mb-6">
        {/* Dot grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Watermark icon */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block pointer-events-none">
          <Home size={110} />
        </div>
        <div className="relative z-10">
          <p className="text-emerald-300 text-sm font-medium">{getGreeting()},</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">Admin Dashboard</h1>
          <p className="text-emerald-300/80 text-sm mt-1">{getToday()}</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map(card => (
          <Link key={card.label} href={card.href}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-3 ${card.bg} ${card.text}`}>
              <card.icon size={22} />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-sm text-slate-500 mt-1">{card.label}</p>
            <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${card.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
              Manage <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide text-slate-500">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map(action => (
            <Link key={action.label} href={action.href} className="btn-primary py-2 text-sm">
              <Plus size={15} /> {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

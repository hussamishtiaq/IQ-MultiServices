'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2, LayoutDashboard, Home, Briefcase, Phone, MapPin, MessageSquare,
  BarChart3, Boxes, Layers, Star, Settings, LogOut, Menu, X, Bell, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function SignOutButton() {
  const router = useRouter()
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }
  return (
    <button onClick={handleSignOut}
      className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-500 text-xs font-medium transition-colors"
      title="Sign out">
      <LogOut size={14} />
      <span className="hidden sm:inline">Sign Out</span>
    </button>
  )
}

const groups = [
  {
    label: 'MAIN',
    links: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'CONTENT',
    links: [
      { href: '/admin/properties', label: 'Properties', icon: Home,      exact: false },
      { href: '/admin/areas',      label: 'Areas',      icon: MapPin,    exact: false },
      { href: '/admin/projects',   label: 'Off-plan',   icon: Layers,    exact: false },
      { href: '/admin/developers', label: 'Developers', icon: Boxes,     exact: false },
      { href: '/admin/services',   label: 'Services',   icon: Briefcase, exact: false },
      { href: '/admin/contacts',   label: 'Contacts',   icon: Phone,     exact: false },
    ],
  },
  {
    label: 'CRM',
    links: [
      { href: '/admin/leads',      label: 'Leads',      icon: MessageSquare, exact: false },
      { href: '/admin/reviews',    label: 'Reviews',    icon: Star,          exact: false },
      { href: '/admin/analytics',  label: 'Analytics',  icon: BarChart3,     exact: false },
    ],
  },
  {
    label: 'ADMINISTRATION',
    links: [{ href: '/admin/settings', label: 'Settings', icon: Settings, exact: false }],
  },
]

function NavLink({ href, label, Icon, exact = false, onClick }: {
  href: string; label: string; Icon: React.ElementType; exact?: boolean; onClick?: () => void
}) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-emerald-800 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
      {label}
    </Link>
  )
}

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full py-3 overflow-y-auto">
      {groups.map(group => (
        <div key={group.label} className="mb-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.links.map(link => (
              <NavLink key={link.href} href={link.href} label={link.label}
                Icon={link.icon} exact={link.exact} onClick={onClose} />
            ))}
          </div>
        </div>
      ))}

      {/* Sign out */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <button onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
          <LogOut size={16} className="text-red-400" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function AdminSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* ── Top Header Bar ── */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <Menu size={20} />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-800 rounded-lg flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block">IQ Admin</span>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <Link href="/" target="_blank"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-medium transition-colors">
            View Site <ChevronRight size={13} />
          </Link>
          <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 bg-emerald-800 rounded-full flex items-center justify-center ml-1">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 fixed top-14 left-0 bottom-0 bg-white border-r border-slate-100 z-30 px-3">
        <SidebarNav />
      </aside>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-64 bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-800 rounded-lg flex items-center justify-center">
                  <Building2 size={14} className="text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">IQ Admin</span>
              </div>
              <button onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 px-3 overflow-y-auto">
              <SidebarNav onClose={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

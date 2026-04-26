'use client'

import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      {/* pt-14 = top header height on all screens; lg:pl-60 = sidebar width on desktop */}
      <div className="lg:pl-60 pt-14">
        <main className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Compass, Home, Building2 } from 'lucide-react'

export const metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Compass size={26} className="text-emerald-700" />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-500 text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/" className="btn-primary flex-1">
            <Home size={15} /> Go home
          </Link>
          <Link href="/properties" className="btn-secondary flex-1">
            <Building2 size={15} /> Browse properties
          </Link>
        </div>
      </div>
    </div>
  )
}

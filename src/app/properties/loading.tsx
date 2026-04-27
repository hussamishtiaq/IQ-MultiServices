import Navbar from '@/components/Navbar'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="h-3 w-24 bg-emerald-800/60 rounded animate-pulse mb-4" />
            <div className="h-8 w-64 bg-emerald-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="container-main py-20 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      </main>
    </>
  )
}

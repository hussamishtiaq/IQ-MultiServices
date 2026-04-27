import Navbar from '@/components/Navbar'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        <div className="container-main py-8">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="aspect-[4/3] bg-slate-200 rounded-2xl animate-pulse" />
              <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
                <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
                <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-1/2 bg-slate-200 rounded animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-12">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
          </div>
        </div>
      </main>
    </>
  )
}

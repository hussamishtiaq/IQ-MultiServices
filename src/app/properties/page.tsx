import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import PropertiesClient from './PropertiesClient'
import type { Property, Area } from '@/types'

export const metadata: Metadata = {
  title: 'Browse Properties',
  description: 'Browse our full catalog of properties: apartments, villas, commercial spaces, land, and offices in Dubai.',
  alternates: { canonical: '/properties' },
  openGraph: {
    title: 'Browse Properties',
    description: 'Browse our full catalog of Dubai properties.',
    url: '/properties',
  },
}

const PAGE_SIZE = 9

export default async function PropertiesPage() {
  const supabase = createClient()
  const [propsRes, areasRes] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase.from('areas').select('*').order('display_order', { ascending: true }),
  ])

  const initialData = {
    data: (propsRes.data as Property[]) ?? [],
    total: propsRes.count ?? null,
    page: 1,
    hasMore: (propsRes.count ?? 0) > PAGE_SIZE,
  }
  const areas = (areasRes.data as Area[]) ?? []

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-16">
        <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white py-14">
          <div className="container-main">
            <div className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={14} />
              <span className="text-white font-medium">Properties</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Browse Properties</h1>
            <p className="mt-2 text-emerald-200 text-lg">Find your perfect property from our listings</p>
          </div>
        </div>

        <Suspense fallback={
          <div className="container-main py-20 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-emerald-600" />
          </div>
        }>
          <PropertiesClient initialData={initialData} areas={areas} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}

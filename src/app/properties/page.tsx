import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import PropertiesClient from './PropertiesClient'
import type { Property } from '@/types'

export const metadata: Metadata = {
  title: 'Browse Properties',
  description: 'Browse our full catalog of properties: apartments, villas, commercial spaces, land, and offices.',
  alternates: { canonical: '/properties' },
  openGraph: {
    title: 'Browse Properties',
    description: 'Browse our full catalog of properties.',
    url: '/properties',
  },
}

const PAGE_SIZE = 9

export default async function PropertiesPage() {
  const supabase = createClient()
  const { data, count } = await supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  const initialData = {
    data: (data as Property[]) ?? [],
    total: count ?? null,
    page: 1,
    hasMore: (count ?? 0) > PAGE_SIZE,
  }

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

        <PropertiesClient initialData={initialData} />
      </main>
      <Footer />
    </>
  )
}

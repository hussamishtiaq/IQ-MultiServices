import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import RouteProgress from '@/components/RouteProgress'
import { SiteFeaturesProvider } from '@/components/SiteFeaturesProvider'
import { getSiteFeatures } from '@/lib/site-features.server'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const SITE_NAME = 'IQ MultiServices'
const DESCRIPTION = 'Premium real estate listings and professional business services. Find apartments, villas, commercial properties, and expert services.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['real estate', 'properties', 'apartments', 'villas', 'business services', 'IQ MultiServices'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const features = await getSiteFeatures()
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Providers>
          <SiteFeaturesProvider value={features}>{children}</SiteFeaturesProvider>
        </Providers>
      </body>
    </html>
  )
}

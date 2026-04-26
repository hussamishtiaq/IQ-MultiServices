import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IQ MultiServices',
  description: 'Your trusted partner in real estate and business services',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

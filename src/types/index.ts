export type Currency = 'USD' | 'AED'

export interface Property {
  id: string
  title: string
  description: string | null
  price: number | null
  currency: Currency
  location: string | null
  type: 'apartment' | 'villa' | 'commercial' | 'land' | 'office'
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  status: 'available' | 'sold' | 'rented'
  images: string[]
  featured: boolean
  created_at: string
}

export interface Service {
  id: string
  title: string
  description: string | null
  icon: string | null
  order: number
  created_at: string
}

export interface Contact {
  id: string
  platform: string
  label: string
  value: string
  icon: string | null
  order: number
  created_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: string | null
}

export type SiteSettings = Record<string, string | null>

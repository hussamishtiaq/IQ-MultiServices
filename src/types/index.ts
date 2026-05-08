export type Currency       = 'USD' | 'AED'
export type ListingType    = 'sale' | 'rent'
export type CompletionStatus = 'ready' | 'off_plan' | 'resale'
export type Furnishing     = 'furnished' | 'semi_furnished' | 'unfurnished'
export type RentPeriod     = 'yearly' | 'monthly' | 'weekly' | 'daily'
export type LeadStatus     = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type PreferredContact = 'whatsapp' | 'phone' | 'email'

export interface Property {
  id: string
  title: string
  slug: string | null
  description: string | null
  price: number | null
  currency: Currency
  location: string | null
  area_id: string | null
  project_id: string | null
  type: 'apartment' | 'villa' | 'commercial' | 'land' | 'office'
  listing_type: ListingType
  completion_status: CompletionStatus
  furnishing: Furnishing | null
  rent_period: RentPeriod | null
  payment_plan: string | null
  handover_date: string | null
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  status: 'available' | 'sold' | 'rented'
  images: string[]
  featured: boolean
  views_count: number
  created_at: string
}

export interface Area {
  id: string
  slug: string
  name: string
  city: string
  hero_image: string | null
  gallery: string[]
  description: string | null
  amenities: string[]
  avg_price_sale_aed: number | null
  avg_price_rent_aed: number | null
  avg_roi_pct: number | null
  popular_unit_types: string[]
  lat: number | null
  lng: number | null
  display_order: number
  created_at: string
}

export interface Developer {
  id: string
  slug: string
  name: string
  logo: string | null
  description: string | null
  website: string | null
  display_order: number
  created_at: string
}

export interface Project {
  id: string
  slug: string
  name: string
  developer_id: string | null
  area_id: string | null
  starting_price_aed: number | null
  payment_plan: string | null
  payment_plan_desc: string | null
  handover_quarter: string | null
  handover_date: string | null
  status: 'pre_launch' | 'launched' | 'under_construction' | 'ready'
  unit_types: string[]
  hero_image: string | null
  gallery: string[]
  brochure_url: string | null
  masterplan_url: string | null
  amenities: string[]
  description: string | null
  featured: boolean
  created_at: string
}

export interface Lead {
  id: string
  property_id: string | null
  project_id: string | null
  area_id: string | null
  source: string | null
  name: string
  email: string | null
  phone: string
  country_code: string | null
  message: string | null
  preferred_contact: PreferredContact | null
  status: LeadStatus
  ip_address: string | null
  user_agent: string | null
  referrer: string | null
  created_at: string
}

export interface Service {
  id: string
  title: string
  description: string | null
  order: number
  created_at: string
}

export interface Contact {
  id: string
  platform: string
  label: string
  value: string
  order: number
  created_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: string | null
}

export type SiteSettings = Record<string, string | null>

export interface Review {
  id: string
  target_type: 'property' | 'area' | 'agent'
  target_id: string
  rating: number
  title: string | null
  body: string | null
  reviewer_name: string | null
  reviewer_email: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PurchaseCalculator from '../PurchaseCalculator'
import PropertyCard from '../PropertyCard'
import type { Property } from '@/types'

const base: Property = {
  id: 'p1', title: 'Marina 3BR', slug: 'marina-3br', description: null, price: 2_500_000, currency: 'AED',
  location: 'Dubai Marina', area_id: null, project_id: null, type: 'apartment', listing_type: 'sale',
  completion_status: 'ready', furnishing: null, studio_type: null, rent_period: null, payment_plan: null,
  handover_date: null, bedrooms: 3, bathrooms: 3, area: 160, status: 'available', images: [], featured: false,
  views_count: 0, permit_number: null, agent_name: null, agent_brn: null, created_at: '',
}

describe('PurchaseCalculator', () => {
  it('renders ready-unit fees with mortgage by default', () => {
    const html = renderToStaticMarkup(<PurchaseCalculator priceAed={2_000_000} offPlan={false} />)
    expect(html).toContain('DLD transfer fee (4%)')
    expect(html).toContain('AED 80,000')
    expect(html).toContain('Monthly payment')
    expect(html).toContain('Mortgage registration')
  })
  it('off-plan hides agency fee and mortgage toggle', () => {
    const html = renderToStaticMarkup(<PurchaseCalculator priceAed={1_000_000} offPlan />)
    expect(html).not.toContain('Agency commission')
    expect(html).not.toContain('With mortgage')
    expect(html).toContain('Oqood')
  })
})

describe('PropertyCard', () => {
  it('shows Golden Visa badge only for AED 2M+ sale listings', () => {
    expect(renderToStaticMarkup(<PropertyCard property={base} />)).toContain('Golden Visa')
    expect(renderToStaticMarkup(<PropertyCard property={{ ...base, price: 1_500_000 }} />)).not.toContain('Golden Visa')
    expect(renderToStaticMarkup(<PropertyCard property={{ ...base, listing_type: 'rent' }} />)).not.toContain('Golden Visa')
  })
  it('links by slug', () => {
    expect(renderToStaticMarkup(<PropertyCard property={base} />)).toContain('href="/properties/marina-3br"')
  })
})

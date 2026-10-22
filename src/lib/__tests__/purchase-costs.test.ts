import { describe, expect, it } from 'vitest'
import { goldenVisaLikely, monthlyPayment, purchaseCosts, toAed } from '../purchase-costs'

const amount = (b: ReturnType<typeof purchaseCosts>, label: RegExp) => b.lines.find(l => label.test(l.label))?.amount

describe('purchaseCosts', () => {
  it('cash purchase of a ready AED 2M unit', () => {
    const b = purchaseCosts({ priceAed: 2_000_000, offPlan: false, financed: false, downPaymentPct: 100 })
    expect(amount(b, /DLD transfer/)).toBe(80_000)
    expect(amount(b, /trustee/)).toBe(4_200)
    expect(amount(b, /Agency/)).toBeCloseTo(42_000)
    expect(b.loanAmount).toBe(0)
    expect(b.totalFees).toBeCloseTo(80_000 + 580 + 4_200 + 42_000)
    expect(b.cashNeeded).toBeCloseTo(2_000_000 + b.totalFees)
  })

  it('uses the lower trustee fee under AED 500k', () => {
    const b = purchaseCosts({ priceAed: 450_000, offPlan: false, financed: false, downPaymentPct: 100 })
    expect(amount(b, /trustee/)).toBe(2_100)
  })

  it('off-plan skips agency commission and trustee fee', () => {
    const b = purchaseCosts({ priceAed: 1_000_000, offPlan: true, financed: false, downPaymentPct: 100 })
    expect(amount(b, /Agency/)).toBeUndefined()
    expect(amount(b, /trustee/)).toBeUndefined()
    expect(b.totalFees).toBe(40_000 + 580)
  })

  it('financed purchase adds mortgage costs and reduces cash needed', () => {
    const b = purchaseCosts({ priceAed: 2_000_000, offPlan: false, financed: true, downPaymentPct: 20 })
    expect(b.loanAmount).toBe(1_600_000)
    expect(amount(b, /Mortgage registration/)).toBe(1_600_000 * 0.0025 + 290)
    expect(b.cashNeeded).toBeCloseTo(400_000 + b.totalFees)
  })

  it('clamps bad inputs', () => {
    const b = purchaseCosts({ priceAed: -5, offPlan: false, financed: true, downPaymentPct: 150 })
    expect(b.loanAmount).toBe(0)
  })
})

describe('monthlyPayment', () => {
  it('matches standard amortization (AED 1.6M, 4.5%, 25y ≈ AED 8,893)', () => {
    expect(monthlyPayment(1_600_000, 4.5, 25)).toBeCloseTo(8893.4, 0)
  })
  it('handles 0% and empty loans', () => {
    expect(monthlyPayment(120_000, 0, 10)).toBe(1000)
    expect(monthlyPayment(0, 4, 25)).toBe(0)
  })
})

describe('goldenVisaLikely', () => {
  it('AED 2M+ sale listings qualify, rentals and land do not', () => {
    expect(goldenVisaLikely({ listing_type: 'sale', price: 2_000_000, currency: 'AED', type: 'apartment' })).toBe(true)
    expect(goldenVisaLikely({ listing_type: 'sale', price: 1_999_999, currency: 'AED', type: 'villa' })).toBe(false)
    expect(goldenVisaLikely({ listing_type: 'rent', price: 3_000_000, currency: 'AED', type: 'villa' })).toBe(false)
    expect(goldenVisaLikely({ listing_type: 'sale', price: 5_000_000, currency: 'AED', type: 'land' })).toBe(false)
  })
  it('converts USD at the peg', () => {
    expect(toAed(1000, 'USD')).toBeCloseTo(3672.5)
    expect(goldenVisaLikely({ listing_type: 'sale', price: 545_000, currency: 'USD', type: 'apartment' })).toBe(true)
    expect(goldenVisaLikely({ listing_type: 'sale', price: 544_000, currency: 'USD', type: 'apartment' })).toBe(false)
  })
})

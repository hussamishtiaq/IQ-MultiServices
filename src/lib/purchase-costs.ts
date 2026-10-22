import type { Currency, Property } from '@/types'

// The AED has been pegged to the USD at 3.6725 since 1997.
export const AED_PER_USD = 3.6725

export function toAed(price: number, currency: Currency): number {
  return currency === 'USD' ? price * AED_PER_USD : price
}

// Dubai buyer-side costs (2026). Market practice: buyer pays the full DLD fee.
export const DUBAI_FEES = {
  dldTransferPct: 0.04,
  dldAdminAed: 580,                 // title deed issuance / admin (sources quote AED 250–580)
  trusteeFeeLowAed: 2000,           // registration trustee, property < AED 500k
  trusteeFeeHighAed: 4000,          // property ≥ AED 500k
  trusteeThresholdAed: 500_000,
  agencyPct: 0.02,
  vatPct: 0.05,
  mortgageRegPct: 0.0025,           // of loan amount
  mortgageRegAdminAed: 290,
  valuationAed: 3000,               // bank valuation, typically AED 2,500–3,500
  bankArrangementPct: 0.01,         // typically 0.5%–1% of loan, often capped
}

export const GOLDEN_VISA_MIN_AED = 2_000_000

export interface CostInput {
  priceAed: number
  offPlan: boolean          // off-plan: commission usually paid by developer, Oqood replaces title deed
  financed: boolean
  downPaymentPct: number    // 0–100
}

export interface CostLine { label: string; amount: number; note?: string }

export interface CostBreakdown {
  lines: CostLine[]
  totalFees: number
  loanAmount: number
  cashNeeded: number        // down payment + all fees
}

export function purchaseCosts(input: CostInput): CostBreakdown {
  const f = DUBAI_FEES
  const price = Math.max(0, input.priceAed)
  const lines: CostLine[] = []

  lines.push({ label: 'DLD transfer fee (4%)', amount: price * f.dldTransferPct })
  lines.push({ label: input.offPlan ? 'Oqood registration / admin' : 'Title deed & admin', amount: f.dldAdminAed })

  if (!input.offPlan) {
    const trustee = price < f.trusteeThresholdAed ? f.trusteeFeeLowAed : f.trusteeFeeHighAed
    lines.push({ label: 'Registration trustee fee (+5% VAT)', amount: trustee * (1 + f.vatPct) })
    lines.push({ label: 'Agency commission (2% + 5% VAT)', amount: price * f.agencyPct * (1 + f.vatPct) })
  }

  const down = Math.min(100, Math.max(0, input.downPaymentPct)) / 100
  const loanAmount = input.financed ? price * (1 - down) : 0
  if (input.financed && loanAmount > 0) {
    lines.push({ label: 'Mortgage registration (0.25% of loan + AED 290)', amount: loanAmount * f.mortgageRegPct + f.mortgageRegAdminAed })
    lines.push({ label: 'Bank valuation', amount: f.valuationAed, note: 'typically AED 2,500–3,500' })
    lines.push({ label: 'Bank arrangement fee (~1% of loan)', amount: loanAmount * f.bankArrangementPct, note: 'varies by bank, often negotiable' })
  }

  const totalFees = lines.reduce((s, l) => s + l.amount, 0)
  return { lines, totalFees, loanAmount, cashNeeded: price - loanAmount + totalFees }
}

/** Standard amortizing loan payment. */
export function monthlyPayment(loan: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12)
  if (loan <= 0 || n <= 0) return 0
  const r = annualRatePct / 100 / 12
  if (r === 0) return loan / n
  return (loan * r) / (1 - Math.pow(1 + r, -n))
}

/**
 * Golden Visa via property needs AED 2M+ of DLD-valued property. We only see the
 * asking price, so this is an indicator ("likely eligible"), not a guarantee.
 */
export function goldenVisaLikely(p: Pick<Property, 'listing_type' | 'price' | 'currency' | 'type'>): boolean {
  if (p.listing_type !== 'sale' || p.price == null) return false
  if (p.type === 'land') return false
  return toAed(p.price, p.currency) >= GOLDEN_VISA_MIN_AED
}

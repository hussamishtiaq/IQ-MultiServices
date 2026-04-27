import type { Currency } from '@/types'

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'AED', label: 'UAE Dirham (AED)', symbol: 'AED' },
  { value: 'USD', label: 'US Dollar (USD)',  symbol: '$'   },
]

const SYMBOLS: Record<Currency, string> = {
  USD: '$',
  AED: 'AED',
}

/**
 * Formats a numeric price with its currency.
 * USD → "$1,234,567"
 * AED → "AED 1,234,567"
 */
export function formatPrice(price: number, currency: Currency = 'AED'): string {
  const num = price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (currency === 'USD') return `$${num}`
  return `AED ${num}`
}

export function currencySymbol(currency: Currency = 'AED'): string {
  return SYMBOLS[currency] ?? currency
}

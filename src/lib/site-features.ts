// Public-site feature switches, stored in site_settings as `feature_<key>` = 'on' | 'off'.

export const SITE_FEATURES = [
  { key: 'whatsapp_buttons', group: 'Messaging', default: false, label: '"Ask on WhatsApp" buttons',
    description: 'Green WhatsApp button on every property card and property page, prefilled with the listing name and reference. The floating WhatsApp button still shows, without the prefilled text.' },
  { key: 'viewing_booking', group: 'Messaging', default: false, label: '"Schedule a visit" booking',
    description: 'Lets visitors pick a viewing date and time on a property page.' },
  { key: 'property_alerts', group: 'Messaging', default: false, label: 'Property alert sign-up',
    description: '"Alert me about similar properties" link on property pages.' },
  { key: 'marketing_consent', group: 'Messaging', default: false, label: 'Marketing opt-in checkboxes',
    description: 'The two "send me listings and offers" checkboxes under contact forms.' },
  { key: 'purchase_calculator', group: 'Property page', default: true, label: 'Cost of buying calculator',
    description: 'DLD fees and mortgage estimate on available sale listings.' },
  { key: 'golden_visa_badge', group: 'Property page', default: true, label: 'Golden Visa badge',
    description: 'Badge on sale listings worth AED 2M or more.' },
  { key: 'verified_listing', group: 'Property page', default: true, label: 'Verified listing box',
    description: 'Shows the Trakheesi permit number and agent BRN when they are filled in.' },
] as const

export type FeatureKey = (typeof SITE_FEATURES)[number]['key']
export type SiteFeatures = Record<FeatureKey, boolean>

export const FEATURE_PREFIX = 'feature_'
export const FEATURES_CACHE_TAG = 'site-features'

export const DEFAULT_FEATURES = Object.fromEntries(SITE_FEATURES.map(f => [f.key, f.default])) as SiteFeatures

export function isFeatureKey(k: string): k is FeatureKey {
  return SITE_FEATURES.some(f => f.key === k)
}

/** Builds the flag map from site_settings rows; missing or unknown values fall back to defaults. */
export function parseFeatures(rows: Array<{ key: string; value: string | null }>): SiteFeatures {
  const out = { ...DEFAULT_FEATURES }
  for (const r of rows) {
    if (!r.key.startsWith(FEATURE_PREFIX)) continue
    const k = r.key.slice(FEATURE_PREFIX.length)
    if (isFeatureKey(k) && (r.value === 'on' || r.value === 'off')) out[k] = r.value === 'on'
  }
  return out
}

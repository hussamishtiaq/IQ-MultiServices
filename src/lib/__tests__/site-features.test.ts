import { describe, expect, it } from 'vitest'
import { DEFAULT_FEATURES, parseFeatures } from '../site-features'

describe('parseFeatures', () => {
  it('hides messaging features and shows buyer tools by default', () => {
    expect(parseFeatures([])).toEqual(DEFAULT_FEATURES)
    expect(DEFAULT_FEATURES).toMatchObject({
      whatsapp_buttons: false, viewing_booking: false, property_alerts: false, marketing_consent: false,
      purchase_calculator: true, golden_visa_badge: true, verified_listing: true,
    })
  })

  it('applies stored on/off values and ignores unrelated or malformed rows', () => {
    const f = parseFeatures([
      { key: 'feature_whatsapp_buttons', value: 'on' },
      { key: 'feature_purchase_calculator', value: 'off' },
      { key: 'feature_viewing_booking', value: 'yes' },
      { key: 'feature_unknown', value: 'on' },
      { key: 'site_name', value: 'on' },
      { key: 'feature_property_alerts', value: null },
    ])
    expect(f.whatsapp_buttons).toBe(true)
    expect(f.purchase_calculator).toBe(false)
    expect(f.viewing_booking).toBe(false)
    expect(f.property_alerts).toBe(false)
    expect(Object.keys(f)).toHaveLength(Object.keys(DEFAULT_FEATURES).length)
  })
})

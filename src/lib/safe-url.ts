const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Build a safe href for a contact entry. Returns null if the value is
 * an unsafe scheme (javascript:, data:, vbscript:, etc.).
 */
export function safeContactHref(platform: string, value: string): string | null {
  const v = value.trim()
  if (!v) return null

  const p = platform.toLowerCase()
  if (p === 'email')    return `mailto:${v}`
  if (p === 'phone')    return `tel:${v}`
  if (p === 'whatsapp') {
    if (/^https?:\/\//i.test(v)) return v
    return `https://wa.me/${v.replace(/\D/g, '')}`
  }

  // Generic URL: allow only safe schemes; if it has no scheme, prepend https://
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {
    try {
      const url = new URL(v)
      return SAFE_SCHEMES.includes(url.protocol) ? v : null
    } catch {
      return null
    }
  }
  return `https://${v}`
}

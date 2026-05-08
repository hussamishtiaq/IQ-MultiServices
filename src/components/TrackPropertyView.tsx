'use client'

import { useEffect, useRef } from 'react'

/**
 * Lightweight property-view beacon. Fires once per mount.
 * Anonymous fingerprint = sha256(userAgent + screen size + day) — coarse but
 * good enough to dedupe accidental refreshes within a day.
 */
export default function TrackPropertyView({
  propertyId,
  areaId,
}: {
  propertyId: string
  areaId?:    string | null
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const fingerprint = (() => {
      try {
        const day = new Date().toISOString().slice(0, 10)
        const raw = `${navigator.userAgent}|${screen.width}x${screen.height}|${day}`
        // Browser-native synchronous hash isn't available; quick non-crypto hash:
        let h = 0
        for (let i = 0; i < raw.length; i++) {
          h = ((h << 5) - h) + raw.charCodeAt(i)
          h |= 0
        }
        return `fp_${Math.abs(h).toString(36)}`
      } catch { return null }
    })()

    const sessionId = (() => {
      try {
        const KEY = '_iq_sid'
        let sid = sessionStorage.getItem(KEY)
        if (!sid) {
          sid = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
          sessionStorage.setItem(KEY, sid)
        }
        return sid
      } catch { return null }
    })()

    const body = JSON.stringify({
      property_id: propertyId,
      area_id:     areaId ?? null,
      fingerprint,
      session_id:  sessionId,
    })

    // Prefer keepalive so the request survives navigation away
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* non-blocking */ })
  }, [propertyId, areaId])

  return null
}

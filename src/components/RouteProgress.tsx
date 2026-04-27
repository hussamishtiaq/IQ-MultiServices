'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Thin top progress bar that animates on every route change.
 * Drives off pathname/searchParams change — when those tick, we briefly
 * show a green bar that finishes within ~600ms.
 */
export default function RouteProgress() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const timer = setTimeout(() => setActive(false), 600)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  return (
    <div
      aria-hidden
      className={`fixed top-0 left-0 right-0 h-0.5 z-[100] pointer-events-none transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`h-full bg-emerald-500 ${active ? 'animate-route-progress' : ''}`}
        style={{ width: active ? '100%' : '0%' }}
      />
    </div>
  )
}

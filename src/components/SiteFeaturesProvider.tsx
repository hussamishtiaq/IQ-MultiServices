'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_FEATURES, type SiteFeatures } from '@/lib/site-features'

const Ctx = createContext<SiteFeatures>(DEFAULT_FEATURES)

export function SiteFeaturesProvider({ value, children }: { value: SiteFeatures; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSiteFeatures(): SiteFeatures {
  return useContext(Ctx)
}

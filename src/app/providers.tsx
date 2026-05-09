'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            5 * 60 * 1000,   // treat data fresh for 5 min
        gcTime:              10 * 60 * 1000,   // keep unused cache for 10 min
        refetchOnWindowFocus: false,
        refetchOnReconnect:   false,
        retry:                1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

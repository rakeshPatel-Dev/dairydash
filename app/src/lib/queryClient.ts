import { QueryClient } from '@tanstack/react-query'

/**
 * Shared query client.
 *
 * Route changes keep queries cached — a revisit renders instantly from cache
 * and only refetches data that is older than staleTime. Counter data moves
 * fast, so keep staleTime short rather than disabling refetch altogether.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // The counter sits on one machine; refetching when the window regains
      // focus would just add load alongside manual saves/invalidations.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const queryKeys = {
  today: (date: string) => ['today', date] as const,
  saleBalances: (from: string, to: string) => ['sale-balances', from, to] as const,
  customers: () => ['customers'] as const,
  customerLedger: (id: string) => ['customer-ledger', id] as const,
  products: () => ['catalog'] as const,
  staff: () => ['staff'] as const,
  audit: (from: string, to: string, action: string) => ['audit', from, to, action] as const,
  settings: () => ['settings'] as const,
  report: (name: string, from: string, to: string, group?: string) => ['report', name, from, to, group] as const,
}

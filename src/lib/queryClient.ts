import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    // Stats arrive from the cart backend hourly, so a minute of freshness is plenty.
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

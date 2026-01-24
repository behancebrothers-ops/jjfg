import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

/**
 * Global error handler for React Query
 */
function handleQueryError(error: unknown) {
  const message = error instanceof Error ? error.message : 'An error occurred';
  
  // Don't show toast for abort errors (user navigation)
  if (error instanceof Error && error.name === 'AbortError') {
    return;
  }
  
  logger.error('Query error', error);
  toast.error(message);
}

/**
 * Global error handler for mutations
 */
function handleMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Operation failed';
  logger.error('Mutation error', error);
  toast.error(message);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleMutationError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - longer cache for better performance
      gcTime: 1000 * 60 * 60, // 1 hour - keep data in cache longer
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors or abort errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') return false;
          if (error.message.includes('4')) return false;
        }
        return failureCount < 1; // Faster failure, only 1 retry
      },
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      networkMode: 'offlineFirst', // Use cached data first
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});

/**
 * Invalidate all queries - useful after auth changes
 */
export function invalidateAllQueries() {
  queryClient.invalidateQueries();
}

/**
 * Clear all cached data - useful on logout
 */
export function clearQueryCache() {
  queryClient.clear();
}

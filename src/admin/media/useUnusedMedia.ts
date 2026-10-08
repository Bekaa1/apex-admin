import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchUnusedMedia } from './api';

/** This hook is used only by the route mounted after RequireAdmin succeeds. */
export function useUnusedMedia() {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'media-orphans', session?.user.id],
    enabled: status === 'ready' && Boolean(session),
    queryFn: ({ signal }) => fetchUnusedMedia(signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { parseDemoVariant, type DemoVariant } from '../demo';
import { queryKeys } from '../queryKeys';
import { FEED_PAGE, fetchNotifications, fetchUnreadCount, markNotificationsRead, subscribeToNotifications } from './api';
import { demoNotifications } from './demo';
import { toNotificationView, type NotificationView } from './model';

export type FeedState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; items: NotificationView[]; loadMore: (() => void) | null; loadingMore: boolean };

function useUserId(): string | undefined {
  return useAuthSession().session?.user.id;
}

function useDemo(): DemoVariant | null {
  const [params] = useSearchParams();
  return parseDemoVariant(params.get('demo'));
}

/** 0 while loading or on error: the red dot only shows what is known to be unread. */
export function useUnreadNotifications(): number {
  const userId = useUserId();
  const demo = useDemo();
  const query = useQuery({
    queryKey: queryKeys.unreadNotifications(userId),
    queryFn: ({ signal }) => fetchUnreadCount(signal),
    enabled: Boolean(userId) && !demo,
    // A fallback for a dropped Realtime connection.
    refetchOnWindowFocus: true,
  });
  if (demo) return demo === 'active' ? demoNotifications().filter((row) => !row.read_at).length : 0;
  return query.data ?? 0;
}

export function useNotificationFeed(): FeedState {
  const userId = useUserId();
  const demo = useDemo();
  const query = useInfiniteQuery({
    queryKey: queryKeys.notificationFeed(userId),
    queryFn: ({ pageParam, signal }) => fetchNotifications(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => (page.length < FEED_PAGE ? undefined : page[page.length - 1].created_at),
    enabled: Boolean(userId) && !demo,
  });
  if (demo === 'loading') return { status: 'loading' };
  if (demo === 'error') return { status: 'error', retry: () => undefined };
  if (demo) return { status: 'ready', items: demo === 'active' ? demoNotifications().map(toNotificationView) : [], loadMore: null, loadingMore: false };
  if (query.isPending) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  return {
    status: 'ready',
    items: query.data.pages.flat().map(toNotificationView),
    loadMore: query.hasNextPage ? () => void query.fetchNextPage() : null,
    loadingMore: query.isFetchingNextPage,
  };
}

/** `mark()` marks all of them read, `mark(ids)` only those. */
export function useMarkNotificationsRead(): { mark: (ids?: string[]) => void; pending: boolean } {
  const userId = useUserId();
  const demo = useDemo();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) }),
  });
  return { mark: (ids) => (demo ? undefined : mutation.mutate(ids)), pending: mutation.isPending };
}

/** Refreshes the dot and the list when the backend creates a notification. */
export function useLiveNotifications(): void {
  const userId = useUserId();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    return subscribeToNotifications(userId, () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) }));
  }, [userId, queryClient]);
}

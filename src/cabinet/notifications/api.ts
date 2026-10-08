import type { Tables } from '../../lib/database.types';
import { requireSupabase } from '../../lib/supabase';

export type NotificationRow = Pick<
  Tables<'site_notifications'>,
  'id' | 'type' | 'severity' | 'title' | 'body' | 'action' | 'ad_id' | 'data' | 'read_at' | 'created_at'
>;

export const FEED_PAGE = 20;

/** Newest first; the next page starts before the oldest one shown. Admin notifications are for the admin panel. */
export async function fetchNotifications(before: string | null, signal: AbortSignal): Promise<NotificationRow[]> {
  let query = requireSupabase()
    .from('site_notifications')
    .select('id, type, severity, title, body, action, ad_id, data, read_at, created_at')
    .eq('audience', 'user')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(FEED_PAGE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query.abortSignal(signal);
  if (error) throw error;
  return data;
}

/** Unread cabinet notifications. `my_unread_notifications_count` also counts admin ones, which the cabinet doesn't list. */
export async function fetchUnreadCount(signal: AbortSignal): Promise<number> {
  const { count, error } = await requireSupabase()
    .from('site_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('audience', 'user')
    .is('read_at', null)
    .abortSignal(signal);
  if (error) throw error;
  return count ?? 0;
}

/** Without ids marks all of them; ids of other users are ignored. */
export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await requireSupabase().rpc('mark_notifications_read', ids ? { p_ids: ids } : {});
  if (error) throw error;
}

/** Calls `onChange` on every new notification and after each reconnect, when some may have been missed. */
export function subscribeToNotifications(userId: string, onChange: () => void): () => void {
  const sb = requireSupabase();
  let joined = false;
  const channel = sb
    .channel(`ntf:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_notifications', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (joined) onChange();
      joined = true;
    });
  return () => {
    void sb.removeChannel(channel);
  };
}

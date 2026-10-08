import { requireSupabase } from '../../lib/supabase';
import { MediaLoadError, mediaErrorKind, parseMediaFiles } from './model';

/** Metadata only. No Storage requests, inferred URLs, range, count or RPC arguments. */
export async function fetchUnusedMedia(signal: AbortSignal) {
  try {
    const { data, error, status } = await requireSupabase()
      .rpc('admin_campaign_media_orphans')
      .abortSignal(signal);
    if (error) throw new MediaLoadError(mediaErrorKind(error.code, status));
    const files = parseMediaFiles(data);
    return { files, loadedAt: Date.now() };
  } catch (error) {
    // Never expose/log error bodies which could contain metadata or server details.
    if (error instanceof MediaLoadError) throw error;
    throw new MediaLoadError('unavailable');
  }
}

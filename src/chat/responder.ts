import type { ChatClient } from '../lib/chatSupabase';
import { ChatError } from './errors';

export async function requestChatReply(client: ChatClient, sessionId: string, messageId: string, signal: AbortSignal): Promise<void> {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new ChatError('not_authenticated');
  try {
    const response = await fetch('/api/chat/respond', {
      method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(75_000)]),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ sessionId, messageId }),
    });
    // Do not render internal error codes or raw reverse-proxy responses.
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
      throw new ChatError('response_unavailable');
    }
  } catch { throw new ChatError('response_unavailable'); }
}

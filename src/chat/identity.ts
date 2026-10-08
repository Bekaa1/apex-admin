import type { Session } from '@supabase/supabase-js';
import type { ChatClient } from '../lib/chatSupabase';
import { ChatError, toChatError } from './errors';
import { isChatUuid } from './model';

export const CHAT_CLIENT_KEY = 'apex-chat-client-key:v1';
export type ChatStorage = Pick<Storage, 'getItem' | 'setItem'>;
const authInitializations = new WeakMap<ChatClient, Promise<Session>>();

export function getChatClientKey(storage: ChatStorage, uuid: () => string): string {
  try {
    const stored = storage.getItem(CHAT_CLIENT_KEY);
    if (isChatUuid(stored)) return stored.toLowerCase();
    const key = uuid();
    if (!isChatUuid(key)) throw new ChatError('invalid_client_key');
    storage.setItem(CHAT_CLIENT_KEY, key);
    return key;
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError('storage_unavailable');
  }
}

export async function withChatIdentityLock<T>(work: () => Promise<T>): Promise<T> {
  // Coordinate tabs where Web Locks is available; single-flight below also
  // protects concurrent callers in this JS context on other browsers.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('apex-chat-initialize:v1', work);
  }
  return work();
}

export function ensureChatAuth(client: ChatClient): Promise<Session> {
  const active = authInitializations.get(client);
  if (active) return active;
  const promise = (async () => {
    try {
      const existing = await client.auth.getSession();
      if (existing.error) throw existing.error;
      if (existing.data.session) return existing.data.session;
      const result = await client.auth.signInAnonymously();
      if (result.error) throw result.error;
      if (!result.data.session) throw new ChatError('not_authenticated');
      return result.data.session;
    } catch (error) { throw toChatError(error); }
  })();
  authInitializations.set(client, promise);
  const release = () => { if (authInitializations.get(client) === promise) authInitializations.delete(client); };
  void promise.then(release, release);
  return promise;
}

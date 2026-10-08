import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './chat.database.types';
import { chatConfig } from '../chat/config';

export type ChatClient = SupabaseClient<Database>;
let client: ChatClient | undefined;

// Lazy: importing the transport never creates a session or opens a connection.
export function getChatSupabase(): ChatClient {
  if (!client) {
    const { url, key } = chatConfig(
      import.meta.env.VITE_CHAT_SUPABASE_URL,
      import.meta.env.VITE_CHAT_SUPABASE_PUBLISHABLE_KEY,
    );
    client = createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'apex-chat-auth:v1',
      },
    });
  }
  return client;
}

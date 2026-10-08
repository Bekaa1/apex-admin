import { getChatSupabase } from '../lib/chatSupabase';
import { ChatTransport } from './transport';

// No network activity until a future widget explicitly calls initialize().
export const chatTransport = new ChatTransport({ getClient: getChatSupabase });
export { ChatTransport } from './transport';
export { ChatError, toChatError } from './errors';
export type { ChatSnapshot } from './transport';
export type { ChatMessage, ChatSender, OutgoingChatMessage } from './model';

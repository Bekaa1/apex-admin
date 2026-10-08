import { getChatSupabase } from '../lib/chatSupabase';
import { ChatTransport } from './transport';
import { requestChatReply } from './responder';

// No network activity until a future widget explicitly calls initialize().
export const chatTransport = new ChatTransport({ getClient: getChatSupabase, requestReply: requestChatReply });
export { ChatTransport } from './transport';
export { ChatError, toChatError } from './errors';
export type { ChatSnapshot } from './transport';
export type { ChatMessage, ChatSender, OutgoingChatMessage } from './model';

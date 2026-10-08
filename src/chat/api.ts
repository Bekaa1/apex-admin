import type { ChatClient } from '../lib/chatSupabase';
import { ChatError, toChatError } from './errors';
import { isChatUuid, messageBody, messageTime, normalizeMessage, type OutgoingChatMessage } from './model';

const signalWithTimeout = (signal?: AbortSignal) => signal
  ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);

export async function getOrCreateChatSession(client: ChatClient, clientKey: string, signal?: AbortSignal): Promise<string> {
  if (!isChatUuid(clientKey)) throw new ChatError('invalid_client_key');
  try {
    const { data, error } = await client.rpc('chat_get_or_create_session', { p_client_key: clientKey })
      .retry(false).abortSignal(signalWithTimeout(signal));
    if (error) throw error;
    if (!isChatUuid(data)) throw new ChatError('invalid_response');
    return data.toLowerCase();
  } catch (error) { throw toChatError(error); }
}

export async function listChatMessages(client: ChatClient, sessionId: string,
  options: { limit?: number; before?: string; signal?: AbortSignal } = {}) {
  if (!isChatUuid(sessionId)) throw new ChatError('session_not_found');
  const limit = options.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new ChatError('invalid_limit', 'limit');
  if (options.before) messageTime(options.before);
  try {
    const { data, error } = await client.rpc('chat_list_messages', {
      p_session_id: sessionId, p_limit: limit, ...(options.before ? { p_before: options.before } : {}),
    }).retry(false).abortSignal(signalWithTimeout(options.signal));
    if (error) throw error;
    if (!Array.isArray(data)) throw new ChatError('invalid_response');
    return data.map(row => normalizeMessage(row, sessionId));
  } catch (error) { throw toChatError(error); }
}

export async function sendChatMessage(client: ChatClient, message: OutgoingChatMessage, signal?: AbortSignal): Promise<string> {
  if (!isChatUuid(message.sessionId)) throw new ChatError('session_not_found');
  if (!isChatUuid(message.clientMessageId)) throw new ChatError('invalid_message', 'client_message_id');
  const body = messageBody(message.body);
  try {
    const { data, error } = await client.rpc('chat_send_message', {
      p_session_id: message.sessionId, p_client_message_id: message.clientMessageId, p_body: body,
    }).retry(false).abortSignal(signalWithTimeout(signal));
    if (error) throw error;
    if (!isChatUuid(data)) throw new ChatError('invalid_response');
    return data.toLowerCase();
  } catch (error) { throw toChatError(error); }
}

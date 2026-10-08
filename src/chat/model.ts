import { ChatError } from './errors';

export type ChatSender = 'visitor' | 'responder';
export type ChatMessage = Readonly<{
  id: string;
  sessionId: string;
  sender: ChatSender;
  body: string;
  clientMessageId: string;
  createdAt: string;
}>;
export type OutgoingChatMessage = Readonly<{ sessionId: string; clientMessageId: string; body: string }>;

export const isChatUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function messageBody(value: string): string {
  if (typeof value !== 'string') throw new ChatError('invalid_message', 'body');
  const body = value.trim();
  if (!body || Array.from(body).length > 4000) throw new ChatError('invalid_message', 'body');
  return body;
}

export function messageTime(value: string): bigint {
  const match = typeof value === 'string' && /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d:\d\d)$/.exec(value);
  if (!match) throw new ChatError('invalid_response');
  const milliseconds = Date.parse(match[1] + match[3]);
  if (!Number.isFinite(milliseconds)) throw new ChatError('invalid_response');
  // Preserve PostgreSQL microseconds; Date.parse alone loses ordering within a ms.
  return BigInt(milliseconds) * 1000n + BigInt((match[2] ?? '').padEnd(6, '0'));
}

export function normalizeMessage(value: unknown, sessionId: string): ChatMessage {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  if (!isChatUuid(row.id) || !isChatUuid(row.session_id) || row.session_id.toLowerCase() !== sessionId.toLowerCase()
    || !isChatUuid(row.client_message_id) || (row.sender !== 'visitor' && row.sender !== 'responder')
    || typeof row.body !== 'string' || !row.body.trim() || Array.from(row.body).length > 4000
    || typeof row.created_at !== 'string') throw new ChatError('invalid_response');
  messageTime(row.created_at);
  return Object.freeze({ id: row.id.toLowerCase(), sessionId: row.session_id.toLowerCase(), sender: row.sender,
    body: row.body, clientMessageId: row.client_message_id.toLowerCase(), createdAt: row.created_at });
}

export function compareMessages(a: ChatMessage, b: ChatMessage): number {
  const first = messageTime(a.createdAt), second = messageTime(b.createdAt);
  return first < second ? -1 : first > second ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function mergeMessages(current: readonly ChatMessage[], incoming: readonly ChatMessage[]): readonly ChatMessage[] {
  const ids = new Set<string>(), keys = new Set<string>();
  const merged = [...current, ...incoming].filter(message => {
    const key = `${message.sessionId}:${message.sender}:${message.clientMessageId}`;
    if (ids.has(message.id) || keys.has(key)) return false;
    ids.add(message.id); keys.add(key);
    return true;
  });
  return Object.freeze(merged.sort(compareMessages));
}

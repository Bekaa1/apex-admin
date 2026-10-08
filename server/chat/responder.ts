import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/chat.database.types.ts';
import { supportPrompt } from './prompt.ts';

type Message = Database['public']['Tables']['chat_messages']['Row'];
export class ReplyError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 503) { super(code); this.code = code; this.status = status; }
}
export type ResponderConfig = { url: string; serviceKey: string; openRouterKey: string; model: string };

export function readConfig(env: NodeJS.ProcessEnv): ResponderConfig | null {
  const url = env.CHAT_SUPABASE_URL?.trim();
  const serviceKey = env.CHAT_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openRouterKey = env.OPENROUTER_API_KEY?.trim();
  if (!url || !serviceKey || !openRouterKey) return null;
  if (url !== 'https://twnzsfsyrdnkjbkxpynl.supabase.co') throw new ReplyError('invalid_chat_project');
  if (!openRouterKey.startsWith('sk-or-')) throw new ReplyError('invalid_openrouter_configuration');
  if (!serviceKey.startsWith('sb_secret_')) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64url').toString());
      if (payload.role !== 'service_role' || (payload.ref && payload.ref !== 'twnzsfsyrdnkjbkxpynl')) throw new Error();
    } catch { throw new ReplyError('invalid_server_chat_key'); }
  }
  return { url, serviceKey, openRouterKey, model: env.OPENROUTER_MODEL?.trim() || 'google/gemini-2.5-flash-lite' };
}

export class ChatResponder {
  private readonly config: ResponderConfig;
  private readonly client: SupabaseClient<Database>;
  private readonly pending = new Map<string, Promise<void>>();
  private readonly sessionQueues = new Map<string, Promise<void>>();
  // Retain generated text when an RPC response is lost: retry saving, not generating.
  private readonly answers = new Map<string, { text: string; created: number }>();
  private readonly rates = new Map<string, { count: number; until: number }>();
  private readonly pricing: () => Promise<string>;

  constructor(config: ResponderConfig, pricing: () => Promise<string> = async () => 'Текущие числовые тарифы не предоставлены; не называй цены по памяти.') {
    this.config = config;
    this.pricing = pricing;
    this.client = createClient<Database>(config.url, config.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) }) },
    });
  }

  async authorize(token: string, sessionId: string): Promise<string> {
    // Validate with Supabase Auth, never trust a decoded client JWT.
    const { data: auth, error: authError } = await this.client.auth.getUser(token);
    if (authError || !auth.user) throw new ReplyError('not_authenticated', 401);
    const { data, error } = await this.client.from('chat_sessions').select('id')
      .eq('id', sessionId).eq('visitor_user_id', auth.user.id).maybeSingle().retry(false);
    if (error) throw new ReplyError('chat_unavailable');
    if (!data) throw new ReplyError('forbidden', 403);
    return auth.user.id;
  }

  respond(userId: string, sessionId: string, messageId: string): Promise<void> {
    const key = `${sessionId}:${messageId}`;
    const existing = this.pending.get(key);
    if (existing) return existing;
    if (this.pending.size >= 4) return Promise.reject(new ReplyError('busy', 429));
    const now = Date.now();
    for (const [id, rate] of this.rates) if (rate.until < now) this.rates.delete(id);
    const rate = this.rates.get(userId) ?? { count: 0, until: now + 60_000 };
    if (rate.count >= 10) return Promise.reject(new ReplyError('rate_limited', 429));
    rate.count++; this.rates.set(userId, rate);
    const previous = this.sessionQueues.get(sessionId) ?? Promise.resolve();
    const work = previous.catch(() => {}).then(() => this.process(sessionId, messageId));
    this.pending.set(key, work); this.sessionQueues.set(sessionId, work);
    const release = () => {
      this.pending.delete(key);
      if (this.sessionQueues.get(sessionId) === work) this.sessionQueues.delete(sessionId);
    };
    void work.then(release, release);
    return work;
  }

  private async savedReply(message: Message): Promise<boolean> {
    const { data, error } = await this.client.from('chat_messages').select('id')
      .eq('session_id', message.session_id).eq('sender', 'responder')
      .eq('client_message_id', message.client_message_id).maybeSingle().retry(false);
    if (error) throw new ReplyError('chat_unavailable');
    return Boolean(data);
  }

  private async process(sessionId: string, messageId: string): Promise<void> {
    const { data: message, error } = await this.client.from('chat_messages').select('*')
      .eq('id', messageId).eq('session_id', sessionId).eq('sender', 'visitor').maybeSingle().retry(false);
    if (error) throw new ReplyError('chat_unavailable');
    if (!message) throw new ReplyError('message_not_found', 404);
    const key = `${sessionId}:${messageId}`;
    if (await this.savedReply(message)) { this.answers.delete(key); return; }
    for (const [id, cached] of this.answers) if (Date.now() - cached.created > 86_400_000) this.answers.delete(id);
    let answer = this.answers.get(key)?.text;
    if (!answer) {
      const { data: rows, error: historyError } = await this.client.from('chat_messages')
        .select('*').eq('session_id', sessionId).lte('created_at', message.created_at)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20).retry(false);
      if (historyError || !rows) throw new ReplyError('history_unavailable');
      const history = rows.filter(row => row.id !== message.id
        && (row.created_at !== message.created_at || row.id < message.id)
        && (row.sender === 'visitor' || row.sender === 'responder'))
        .reverse().slice(-19).map(row => ({ role: row.sender === 'visitor' ? 'user' : 'assistant', content: row.body }));
      history.push({ role: 'user', content: message.body });
      answer = await this.generate(history);
      if (this.answers.size >= 1000) this.answers.delete(this.answers.keys().next().value!);
      this.answers.set(key, { text: answer, created: Date.now() });
    }
    // Covers another responder publishing while this process was generating.
    if (await this.savedReply(message)) { this.answers.delete(key); return; }
    const { error: saveError } = await this.client.rpc('chat_add_response', {
      p_session_id: sessionId, p_client_message_id: message.client_message_id, p_body: answer,
    }).retry(false);
    if (saveError) {
      if (await this.savedReply(message)) { this.answers.delete(key); return; }
      throw new ReplyError('save_result_unknown');
    }
    this.answers.delete(key);
  }

  private async generate(history: { role: string; content: string }[]): Promise<string> {
    const pricing = await this.pricing();
    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: AbortSignal.timeout(40_000),
        headers: { Authorization: `Bearer ${this.config.openRouterKey}`, 'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Apex Support' },
        body: JSON.stringify({ model: this.config.model,
          messages: [
            { role: 'system', content: supportPrompt },
            { role: 'system', content: `Канал: веб-чат сайта. Верни текст ответа в Markdown. Передача менеджеру в этом канале недоступна.\n\n${pricing}` },
            ...history,
          ],
          max_tokens: 600, temperature: 0.3, stream: false }),
      });
    } catch { throw new ReplyError('generation_unavailable'); }
    if (!response.ok) throw new ReplyError(response.status === 429 ? 'rate_limited' : 'generation_unavailable', response.status === 429 ? 429 : 503);
    const data = await response.json().catch(() => null) as { error?: unknown; choices?: { message?: { content?: unknown } }[] } | null;
    const content = data?.choices?.[0]?.message?.content;
    if (data?.error || typeof content !== 'string' || !content.trim()) throw new ReplyError('empty_answer');
    return Array.from(content.trim()).slice(0, 4000).join('');
  }
}

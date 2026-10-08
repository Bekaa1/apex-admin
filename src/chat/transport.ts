import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatClient } from '../lib/chatSupabase';
import { getOrCreateChatSession, listChatMessages, sendChatMessage } from './api';
import { ChatError, toChatError } from './errors';
import { ensureChatAuth, getChatClientKey, withChatIdentityLock, type ChatStorage } from './identity';
import { compareMessages, isChatUuid, mergeMessages, messageBody, normalizeMessage,
  type ChatMessage, type OutgoingChatMessage } from './model';

export type ChatSnapshot = Readonly<{
  phase: 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'error';
  sessionId: string | null;
  messages: readonly ChatMessage[];
  error: ChatError | null;
  errorSource: 'connection' | 'history' | 'send' | null;
  historyLoaded: boolean;
  hasOlderMessages: boolean;
  replyPending: boolean;
  replyError: ChatError | null;
}>;
type Run = {
  client: ChatClient;
  controller: AbortController;
  sessionId: string | null;
  channel?: RealtimeChannel;
  unsubscribeAuth?: () => void;
  subscribed: boolean;
  historyLoaded: boolean;
  checkpoint: ChatMessage | null;
  sync: Promise<void>;
};
type Options = {
  getClient: () => ChatClient;
  getStorage?: () => ChatStorage;
  uuid?: () => string;
  subscribeTimeoutMs?: number;
  requestReply?: (client: ChatClient, sessionId: string, messageId: string, signal: AbortSignal) => Promise<void>;
};
const emptySnapshot = (): ChatSnapshot => Object.freeze({ phase: 'idle', sessionId: null, messages: Object.freeze([]), error: null,
  errorSource: null, historyLoaded: false, hasOlderMessages: false, replyPending: false, replyError: null });

/** Headless, explicit lifecycle. Consumers own initialize/subscribe/dispose. */
export class ChatTransport {
  private readonly options: Options;
  private readonly uuid: () => string;
  private snapshot = emptySnapshot();
  private readonly listeners = new Set<() => void>();
  private run: Run | null = null;
  private initialization: Promise<void> | null = null;
  private cleanup: Promise<void> = Promise.resolve();
  private generation = 0;
  private readonly sending = new Map<string, Promise<string>>();
  private readonly bodies = new Map<string, string>();
  private readonly replies = new Map<string, Promise<void>>();
  private readonly failedReplies = new Map<string, string>();

  constructor(options: Options) {
    this.options = options;
    this.uuid = options.uuid ?? (() => crypto.randomUUID());
  }

  getSnapshot = (): ChatSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<ChatSnapshot>) {
    this.snapshot = Object.freeze({ ...this.snapshot, ...patch });
    for (const listener of this.listeners) {
      // A consumer callback must not interrupt channel cleanup or an RPC.
      try { listener(); } catch { /* Consumer owns its rendering errors. */ }
    }
  }

  private assertCurrent(run: Run) {
    if (this.run !== run || run.controller.signal.aborted) throw new ChatError('cancelled');
  }

  private report(run: Run, error: unknown, errorSource: ChatSnapshot['errorSource'] = 'history') {
    if (this.run === run && !run.controller.signal.aborted) this.update({ error: toChatError(error), errorSource });
  }

  private stop() {
    const previous = this.run;
    this.run = null;
    this.initialization = null;
    this.generation++;
    this.sending.clear();
    this.bodies.clear();
    this.replies.clear();
    this.failedReplies.clear();
    if (previous) {
      previous.controller.abort();
      previous.unsubscribeAuth?.();
      if (previous.channel) {
        const channel = previous.channel;
        this.cleanup = this.cleanup.then(async () => {
          await previous.client.removeChannel(channel);
        });
      }
    }
  }

  dispose(): Promise<void> {
    this.stop();
    this.update(emptySnapshot());
    return this.cleanup;
  }

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    if (this.run && this.snapshot.phase === 'ready') return Promise.resolve();
    this.stop();
    const generation = this.generation;
    this.update({ ...emptySnapshot(), phase: 'connecting' });
    const promise = this.start(generation).catch(error => {
      const safe = toChatError(error);
      if (generation === this.generation) {
        const errorSource = this.run?.subscribed ? 'history' : 'connection';
        this.stop();
        this.update({ ...emptySnapshot(), phase: 'error', error: safe, errorSource });
      }
      throw safe;
    });
    this.initialization = promise;
    const release = () => { if (this.initialization === promise) this.initialization = null; };
    void promise.then(release, release);
    return promise;
  }

  private async start(generation: number) {
    await this.cleanup;
    if (generation !== this.generation) throw new ChatError('cancelled');
    const client = this.options.getClient();
    const run: Run = { client, controller: new AbortController(), sessionId: null,
      subscribed: false, historyLoaded: false, checkpoint: null, sync: Promise.resolve() };
    this.run = run;
    await withChatIdentityLock(async () => {
      this.assertCurrent(run);
      let storage: ChatStorage;
      try { storage = this.options.getStorage ? this.options.getStorage() : localStorage; }
      catch { throw new ChatError('storage_unavailable'); }
      const key = getChatClientKey(storage, this.uuid);
      const session = await ensureChatAuth(client);
      this.assertCurrent(run);
      const { data } = client.auth.onAuthStateChange((_event, current) => {
        if (this.run !== run || (current && current.user.id === session.user.id)) return;
        // Synchronous invalidation; never await Supabase calls inside Auth's lock.
        this.stop();
        this.update({ ...emptySnapshot(), phase: 'error', error: new ChatError('not_authenticated'), errorSource: 'connection' });
      });
      run.unsubscribeAuth = () => data.subscription.unsubscribe();
      await client.realtime.setAuth(session.access_token);
      this.assertCurrent(run);
      run.sessionId = await getOrCreateChatSession(client, key, run.controller.signal);
    });
    this.assertCurrent(run);
    this.update({ sessionId: run.sessionId });
    await this.connectRealtime(run);
    this.assertCurrent(run);
    await this.synchronize(run);
  }

  private connectRealtime(run: Run): Promise<void> {
    return new Promise((resolve, reject) => {
      let joined = false;
      const finish = (error?: ChatError) => {
        clearTimeout(timer);
        run.controller.signal.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new ChatError('cancelled'));
      const timer = setTimeout(() => finish(new ChatError('realtime')), this.options.subscribeTimeoutMs ?? 30_000);
      run.controller.signal.addEventListener('abort', abort, { once: true });
      run.channel = run.client.channel(`apex-chat:${run.sessionId}:${this.uuid()}`, {
        config: { postgres_changes_options: { wait: true } },
      });
      run.channel.on('postgres_changes', {
        schema: 'public', table: 'chat_messages', event: 'INSERT', filter: `session_id=eq.${run.sessionId}`,
      }, payload => {
        if (this.run !== run || run.controller.signal.aborted) return;
        try {
          const message = normalizeMessage(payload.new, run.sessionId!);
          if (message.sender === 'responder') {
            for (const [id, key] of this.failedReplies) if (key === message.clientMessageId) this.failedReplies.delete(id);
          }
          this.update({ messages: mergeMessages(this.snapshot.messages, [message]),
            ...(this.failedReplies.size === 0 ? { replyError: null } : {}) });
        } catch (error) { this.report(run, error); }
      }).subscribe(status => {
        if (this.run !== run || run.controller.signal.aborted) return;
        if (status === 'SUBSCRIBED') {
          run.subscribed = true;
          if (!joined) { joined = true; finish(); }
          else {
            // Capture up to the last successful history checkpoint, even when
            // more than one page was missed while the socket was disconnected.
            void this.synchronize(run).catch(error => this.report(run, error));
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          run.subscribed = false;
          const error = new ChatError('realtime');
          if (!joined) finish(error);
          else this.update({ phase: 'reconnecting', error, errorSource: 'connection' });
        }
      });
    });
  }

  private synchronize(run: Run): Promise<void> {
    const pending = run.sync.then(async () => {
      this.assertCurrent(run);
      const checkpoint = run.checkpoint;
      let before: string | undefined;
      let newest: ChatMessage | null = null;
      while (true) {
        const page = await listChatMessages(run.client, run.sessionId!, { limit: 200, before, signal: run.controller.signal });
        this.assertCurrent(run);
        page.sort(compareMessages);
        if (!run.historyLoaded) this.update({ hasOlderMessages: page.length === 200 });
        newest ??= page.at(-1) ?? null;
        this.update({ messages: mergeMessages(this.snapshot.messages, page) });
        if (!run.historyLoaded || page.length < 200 || (checkpoint && compareMessages(page[0], checkpoint) <= 0)) break;
        const cursor = page[0].createdAt;
        if (cursor === before) throw new ChatError('invalid_response');
        before = cursor;
      }
      run.checkpoint = newest ?? checkpoint;
      run.historyLoaded = true;
      this.update({ phase: run.subscribed ? 'ready' : 'reconnecting', historyLoaded: true,
        error: run.subscribed ? null : new ChatError('realtime'), errorSource: run.subscribed ? null : 'connection' });
    });
    run.sync = pending.catch(() => {});
    return pending;
  }

  private currentRun(): Run {
    const run = this.run;
    if (!run?.sessionId || !['ready', 'reconnecting'].includes(this.snapshot.phase)) throw new ChatError('not_authenticated');
    this.assertCurrent(run);
    return run;
  }

  async refreshHistory(): Promise<void> {
    const run = this.currentRun();
    try { await this.synchronize(run); }
    catch (error) { this.report(run, error); throw toChatError(error); }
  }

  async loadOlder(before: string, limit = 100): Promise<readonly ChatMessage[]> {
    const run = this.currentRun();
    try {
      const page = await listChatMessages(run.client, run.sessionId!, { before, limit, signal: run.controller.signal });
      this.assertCurrent(run);
      this.update({ messages: mergeMessages(this.snapshot.messages, page), hasOlderMessages: page.length === limit,
        error: null, errorSource: null });
      return page;
    } catch (error) { this.report(run, error); throw toChatError(error); }
  }

  prepareMessage(text: string): OutgoingChatMessage {
    const run = this.currentRun();
    const body = messageBody(text);
    const clientMessageId = this.uuid();
    if (!isChatUuid(clientMessageId)) throw new ChatError('invalid_message', 'client_message_id');
    return Object.freeze({ sessionId: run.sessionId!, clientMessageId, body });
  }

  private requestReply(run: Run, messageId: string, clientMessageId: string): Promise<void> {
    if (!this.options.requestReply) return Promise.resolve();
    const existing = this.replies.get(messageId);
    if (existing) return existing;
    this.failedReplies.delete(messageId);
    const work = (async () => {
      try {
        await this.options.requestReply!(run.client, run.sessionId!, messageId, run.controller.signal);
        this.assertCurrent(run);
        try { await this.synchronize(run); } catch (error) { this.report(run, error); }
      } catch {
        if (this.run !== run || run.controller.signal.aborted) return;
        // An answer delivered by Realtime proves success even if HTTP was interrupted.
        const answered = this.snapshot.messages.some(row => row.sender === 'responder' && row.clientMessageId === clientMessageId);
        if (!answered) this.failedReplies.set(messageId, clientMessageId);
      } finally {
        if (this.run === run) {
          this.replies.delete(messageId);
          this.update({ replyPending: this.replies.size > 0,
            replyError: this.failedReplies.size ? new ChatError('response_unavailable') : null });
        }
      }
    })();
    this.replies.set(messageId, work);
    this.update({ replyPending: true, replyError: this.failedReplies.size ? this.snapshot.replyError : null });
    return work;
  }

  async retryReplies(): Promise<void> {
    const run = this.currentRun();
    await Promise.all([...this.failedReplies].map(([id, key]) => this.requestReply(run, id, key)));
  }

  // Retain this prepared object in the caller until the result is known.
  // Retry send(message), not prepareMessage(text): only the latter creates a key.
  send(message: OutgoingChatMessage): Promise<string> {
    let run: Run;
    try {
      run = this.currentRun();
      if (message.sessionId !== run.sessionId) throw new ChatError('forbidden');
      messageBody(message.body);
      const prior = this.bodies.get(message.clientMessageId);
      if (prior !== undefined && prior !== message.body) throw new ChatError('invalid_message', 'client_message_id');
      this.bodies.set(message.clientMessageId, message.body);
    } catch (error) { return Promise.reject(toChatError(error)); }
    const existing = this.sending.get(message.clientMessageId);
    if (existing) return existing;
    const promise = (async () => {
      try {
        const id = await sendChatMessage(run.client, message, run.controller.signal);
        this.assertCurrent(run);
        // RPC returns only UUID. Read the canonical timestamp/body; do not
        // fabricate a row or turn a confirmed send into a failed send if reading fails.
        try { await this.synchronize(run); } catch (error) { this.report(run, error); }
        if (this.run === run && !run.controller.signal.aborted) void this.requestReply(run, id, message.clientMessageId);
        return id;
      } catch (error) { this.report(run, error, 'send'); throw toChatError(error); }
    })();
    this.sending.set(message.clientMessageId, promise);
    const release = () => { if (this.sending.get(message.clientMessageId) === promise) this.sending.delete(message.clientMessageId); };
    void promise.then(release, release);
    return promise;
  }
}

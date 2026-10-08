import type { ChatSnapshot, ChatTransport } from '../transport';
import { compareMessages, messageBody, type ChatMessage, type OutgoingChatMessage } from '../model';
import { toChatError, type ChatErrorCode } from '../errors';

export type WidgetTransport = Pick<ChatTransport, 'subscribe' | 'getSnapshot' | 'initialize' | 'dispose' | 'prepareMessage' | 'send' | 'refreshHistory' | 'loadOlder'>
  & Partial<Pick<ChatTransport, 'retryReplies'>>;
type LocalMessage = { prepared: OutgoingChatMessage; createdAt: string; status: 'sending' | 'sent' | 'failed'; serverId?: string };
export type DisplayMessage = { key: string; id?: string; clientMessageId: string; sender: 'visitor' | 'responder';
  body: string; createdAt: string; status?: LocalMessage['status'] };
export type WidgetSnapshot = {
  open: boolean; draft: string; connection: ChatSnapshot; messages: readonly DisplayMessage[];
  unread: number; newMessages: number; announcement: number;
  sending: boolean; loadingOlder: boolean; retrying: boolean; formError: ChatErrorCode | null;
};

export function combineVisibleMessages(server: readonly ChatMessage[], local: readonly LocalMessage[]): DisplayMessage[] {
  const ids = new Set(server.map(message => message.id));
  const visitorKeys = new Set(server.filter(message => message.sender === 'visitor').map(message => message.clientMessageId));
  return [
    ...server.map(message => ({ ...message, key: `${message.sender}:${message.clientMessageId}`, status: message.sender === 'visitor' ? 'sent' as const : undefined })),
    ...local.filter(message => !visitorKeys.has(message.prepared.clientMessageId) && !(message.serverId && ids.has(message.serverId)))
      .map(message => ({ key: `visitor:${message.prepared.clientMessageId}`, id: message.serverId, sender: 'visitor' as const,
        clientMessageId: message.prepared.clientMessageId, body: message.prepared.body, createdAt: message.createdAt, status: message.status })),
  ];
}

export function shouldSendOnEnter(event: { key: string; shiftKey: boolean; isComposing?: boolean; keyCode?: number }): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
export const isNearBottom = (scrollTop: number, clientHeight: number, scrollHeight: number) => scrollHeight - scrollTop - clientHeight < 80;

export class ChatWidgetController {
  private readonly transport: WidgetTransport;
  private readonly now: () => string;
  private readonly listeners = new Set<() => void>();
  private local: LocalMessage[] = [];
  private state: WidgetSnapshot;
  private unsubscribe?: () => void;
  private started = false;
  private baseline = false;
  private latest: ChatMessage | null = null;
  private sessionId: string | null = null;
  private seen = new Set<string>();
  private nearBottom = true;
  private draftVersion = 0;
  private generation = 0;

  constructor(transport: WidgetTransport, now = () => new Date().toISOString()) {
    this.transport = transport; this.now = now;
    this.state = { open: false, draft: '', connection: transport.getSnapshot(), messages: [], unread: 0,
      newMessages: 0, announcement: 0, sending: false, loadingOlder: false, retrying: false, formError: null };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<WidgetSnapshot> = {}) {
    this.state = { ...this.state, ...patch, messages: combineVisibleMessages((patch.connection ?? this.state.connection).messages, this.local) };
    for (const listener of this.listeners) listener();
  }
  mount = () => {
    this.unsubscribe = this.transport.subscribe(this.receive);
    this.receive();
    return () => {
      this.generation++; this.unsubscribe?.(); this.unsubscribe = undefined;
      void this.transport.dispose().catch(() => {});
    };
  };
  private receive = () => {
    const connection = this.transport.getSnapshot();
    if ((connection.sessionId && this.sessionId && connection.sessionId !== this.sessionId)
      || connection.error?.code === 'not_authenticated') {
      this.local = []; this.seen.clear(); this.baseline = false; this.latest = null;
      this.update({ draft: '', unread: 0, newMessages: 0 });
    }
    if (connection.sessionId) this.sessionId = connection.sessionId;
    const additions = connection.messages.filter(message => !this.seen.has(message.id)
      && this.baseline && (!this.latest || compareMessages(message, this.latest) > 0));
    const responses = additions.filter(message => message.sender === 'responder').length;
    for (const message of connection.messages) this.seen.add(message.id);
    this.latest = connection.messages.at(-1) ?? this.latest;
    if (connection.historyLoaded) this.baseline = true;
    this.update({ connection,
      unread: this.state.unread + (!this.state.open ? responses : 0),
      newMessages: this.state.newMessages + (this.state.open && !this.nearBottom ? additions.length : 0),
      announcement: this.state.announcement + (this.state.open ? responses : 0),
    });
  };
  open = () => {
    this.nearBottom = true;
    this.update({ open: true, unread: 0, newMessages: 0 });
    if (!this.started) { this.started = true; void this.reconnect(); }
  };
  close = () => { this.update({ open: false, announcement: 0 }); };
  setDraft = (draft: string) => {
    this.draftVersion++;
    this.update({ draft: Array.from(draft).slice(0, 4000).join(''), formError: null });
  };
  setNearBottom = (near: boolean) => {
    this.nearBottom = near;
    if (near && (this.state.newMessages || this.state.unread)) this.update({ newMessages: 0, unread: 0 });
  };
  reconnect = async () => {
    if (this.state.retrying) return;
    const generation = this.generation;
    this.update({ retrying: true });
    try {
      if (this.state.connection.historyLoaded && this.state.connection.errorSource === 'history') await this.transport.refreshHistory();
      else await this.transport.initialize();
    } catch { /* Transport exposes a safe, classified error in its snapshot. */ }
    finally { if (generation === this.generation) this.update({ retrying: false }); }
  };
  retryReplies = async () => {
    try { await this.transport.retryReplies?.(); }
    catch { /* Transport exposes a safe response error; the visitor message is saved. */ }
  };
  sendDraft = async () => {
    if (this.state.sending || !['ready', 'reconnecting'].includes(this.state.connection.phase)) return;
    try {
      const body = messageBody(this.state.draft);
      const failed = this.local.find(message => message.status === 'failed' && message.prepared.body === body);
      const message = failed ?? { prepared: this.transport.prepareMessage(body), createdAt: this.now(), status: 'sending' as const };
      if (!failed) this.local.push(message);
      await this.sendLocal(message);
    } catch (error) { this.update({ formError: toChatError(error).code }); }
  };
  retryMessage = async (clientMessageId: string) => {
    if (this.state.sending || !['ready', 'reconnecting'].includes(this.state.connection.phase)) return;
    const message = this.local.find(item => item.prepared.clientMessageId === clientMessageId && item.status === 'failed');
    if (message) await this.sendLocal(message);
  };
  private async sendLocal(message: LocalMessage) {
    const generation = this.generation, version = this.draftVersion;
    const clearsDraft = this.state.draft.trim() === message.prepared.body;
    message.status = 'sending';
    this.update({ sending: true, formError: null });
    try {
      message.serverId = await this.transport.send(message.prepared);
      message.status = 'sent';
    } catch {
      const confirmed = this.transport.getSnapshot().messages.find(item => item.sender === 'visitor' && item.clientMessageId === message.prepared.clientMessageId);
      message.status = confirmed ? 'sent' : 'failed';
      message.serverId = confirmed?.id;
    }
    if (generation !== this.generation) return;
    this.update({ sending: false, ...(message.status === 'sent' && clearsDraft && version === this.draftVersion ? { draft: '' } : {}) });
  }
  loadOlder = async () => {
    const first = this.state.connection.messages[0];
    if (!first || this.state.loadingOlder || !this.state.connection.hasOlderMessages) return;
    const generation = this.generation;
    this.update({ loadingOlder: true });
    try { await this.transport.loadOlder(first.createdAt, 100); }
    catch { /* Classified history error comes from the transport. */ }
    finally { if (generation === this.generation) this.update({ loadingOlder: false }); }
  };
}

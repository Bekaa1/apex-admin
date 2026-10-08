import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

// Only transpiled frontend modules and a closed, in-memory Supabase double.
// No client configuration, Auth API, websocket, env file or external fetch.
const root = fileURLToPath(new URL('../', import.meta.url));
const modules = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const source = readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
  } }).outputText;
  vm.runInNewContext(compiled, { exports, require: name => {
    assert.ok(name.startsWith('.'), 'No runtime SDK/network imports in transport');
    return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
  }, URL, atob, AbortController, AbortSignal, setTimeout, clearTimeout }, { filename: relative });
  return exports;
}
const { ChatTransport } = load('src/chat/transport.ts');
const { toChatError } = load('src/chat/errors.ts');
const { getChatClientKey, CHAT_CLIENT_KEY, ensureChatAuth } = load('src/chat/identity.ts');
const { normalizeMessage, mergeMessages, messageBody } = load('src/chat/model.ts');
const { chatConfig } = load('src/chat/config.ts');
const { listChatMessages } = load('src/chat/api.ts');
const { ChatWidgetController } = load('src/chat/widget/controller.ts');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sid = uuid(1);
const authSession = { user: { id: uuid(2) }, access_token: 'synthetic-token' };
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const row = (n, overrides = {}) => ({ id: uuid(n + 100), session_id: sid, sender: 'visitor', body: `Text ${n}`,
  client_message_id: uuid(n + 1000), created_at: `2026-10-08T10:00:00.${String(n).padStart(6, '0')}+00:00`, ...overrides });
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
function fixture(options = {}) {
  const calls = [], channels = [], removed = [], authListeners = new Set(), events = [];
  const store = options.storage ?? storage();
  let sequence = 10000, session = options.noSession ? null : authSession, signIns = 0, reads = 0;
  let rows = options.rows ?? [], handler = options.handler;
  const client = {
    auth: {
      getSession: async () => { reads++; events.push('auth'); return { data: { session }, error: null }; },
      signInAnonymously: async () => {
        signIns++; events.push('sign-in');
        if (options.authGate) await options.authGate;
        if (options.authError) return { data: { session: null }, error: options.authError };
        session = authSession;
        return { data: { session }, error: null };
      },
      onAuthStateChange: fn => { authListeners.add(fn); return { data: { subscription: { unsubscribe: () => authListeners.delete(fn) } } }; },
    },
    realtime: { setAuth: async token => { assert.equal(token, authSession.access_token); events.push('realtime-auth'); } },
    rpc: (name, args) => {
      assert.ok(['chat_get_or_create_session', 'chat_list_messages', 'chat_send_message'].includes(name));
      assert.ok(session, 'RPC requires authentication');
      const call = { name, args, retry: null };
      calls.push(call); events.push(name);
      const builder = {
        retry: enabled => { call.retry = enabled; return builder; },
        abortSignal: async signal => {
          assert.equal(call.retry, false); assert.ok(signal instanceof AbortSignal);
          if (handler) { const result = await handler(name, args); if (result) return result; }
          if (name === 'chat_get_or_create_session') return { data: sid, error: null };
          if (name === 'chat_list_messages') return { data: rows.filter(r => !args.p_before || r.created_at < args.p_before)
            .slice(-args.p_limit), error: null };
          let message = rows.find(r => r.sender === 'visitor' && r.client_message_id === args.p_client_message_id);
          if (!message) { message = row(rows.length + 1, { body: args.p_body, client_message_id: args.p_client_message_id }); rows.push(message); }
          return { data: message.id, error: null };
        },
      };
      return builder;
    },
    channel: (name, config) => {
      assert.ok(session); assert.equal(config.config.postgres_changes_options.wait, true);
      const ch = { name, config, binding: null, event: null, state: null,
        on: (_type, binding, fn) => { ch.binding = binding; ch.event = fn; return ch; },
        subscribe: fn => {
          ch.state = fn; events.push('subscribe');
          if (!options.manualSubscribe) queueMicrotask(() => fn('SUBSCRIBED'));
          return ch;
        },
      };
      channels.push(ch); return ch;
    },
    removeChannel: async ch => { removed.push(ch); return 'ok'; },
  };
  const transport = new ChatTransport({ getClient: () => client, getStorage: () => store,
    uuid: () => uuid(sequence++), subscribeTimeoutMs: 100, requestReply: options.requestReply });
  return { transport, client, calls, channels, removed, events, storage: store,
    signIns: () => signIns, authReads: () => reads, authListeners,
    setRows: value => { rows = value; }, setHandler: value => { handler = value; },
    changeAuth: value => { session = value; for (const fn of [...authListeners]) fn('SIGNED_OUT', value); },
  };
}

test('initialization is single-flight, anonymous login once, restored session is reused', async () => {
  const gate = deferred(), f = fixture({ noSession: true, authGate: gate.promise });
  const first = f.transport.initialize();
  assert.equal(f.transport.initialize(), first);
  await tick(); assert.equal(f.signIns(), 1); assert.equal(f.calls.length, 0);
  gate.resolve(); await first;
  await f.transport.initialize(); assert.equal(f.channels.length, 1);
  assert.equal(f.transport.getSnapshot().sessionId, sid);
  await f.transport.dispose(); await f.transport.initialize();
  assert.equal(f.signIns(), 1); assert.equal(f.channels.length, 2); assert.equal(f.removed.length, 1);
  const keys = f.calls.filter(c => c.name === 'chat_get_or_create_session').map(c => c.args.p_client_key);
  assert.equal(new Set(keys).size, 1);
  await f.transport.dispose();
});

test('authentication helper serializes callers sharing the Chat client', async () => {
  const gate = deferred(), f = fixture({ noSession: true, authGate: gate.promise });
  const first = ensureChatAuth(f.client), second = ensureChatAuth(f.client);
  assert.equal(first, second); await tick(); assert.equal(f.signIns(), 1);
  gate.resolve(); await first;
});

test('complete widget-to-transport flow restores identity and history across route unmounts', async () => {
  const f = fixture({ noSession: true });
  const widget = new ChatWidgetController(f.transport);
  const unmount = widget.mount();
  assert.equal(f.calls.length, 0); assert.equal(f.signIns(), 0);
  widget.open(); await tick();
  assert.equal(widget.getSnapshot().connection.phase, 'ready');
  widget.setDraft('LOCAL-SMOKE'); await widget.sendDraft();
  const sent = f.transport.getSnapshot().messages[0];
  f.channels[0].event({ new: row(1, { body: sent.body, client_message_id: sent.clientMessageId }) });
  assert.equal(widget.getSnapshot().messages.length, 1);
  widget.close();
  const response = row(2, { sender: 'responder', body: 'LOCAL-SMOKE-RESPONSE' });
  f.setRows([row(1, { body: sent.body, client_message_id: sent.clientMessageId }), response]);
  f.channels[0].event({ new: response }); f.channels[0].event({ new: response });
  assert.equal(widget.getSnapshot().unread, 1);
  widget.open();
  assert.equal(widget.getSnapshot().unread, 0);
  assert.equal(widget.getSnapshot().messages.length, 2);
  assert.equal(f.signIns(), 1); assert.equal(f.channels.length, 1);
  const clientKey = f.storage.getItem(CHAT_CLIENT_KEY);
  unmount(); await tick();
  const restored = new ChatWidgetController(f.transport);
  const unmountRestored = restored.mount();
  restored.open(); await tick();
  assert.equal(restored.getSnapshot().messages.length, 2);
  assert.equal(restored.getSnapshot().unread, 0);
  assert.equal(f.signIns(), 1);
  assert.equal(f.storage.getItem(CHAT_CLIENT_KEY), clientKey);
  assert.equal(f.channels.length - f.removed.length, 1);
  assert.equal(new Set(f.calls.filter(c => c.name === 'chat_get_or_create_session').map(c => c.args.p_client_key)).size, 1);
  unmountRestored(); await tick();
  assert.equal(f.channels.length, f.removed.length);
});

test('widget with actual transport retries one message key and reconciles reconnect history', async () => {
  const f = fixture(); const widget = new ChatWidgetController(f.transport);
  const unmount = widget.mount(); widget.open(); await tick();
  let fail = true;
  f.setHandler(name => name === 'chat_send_message' && fail ? { data: null, error: { message: 'Failed to fetch' } } : undefined);
  widget.setDraft('Retry safely'); await widget.sendDraft();
  assert.equal(widget.getSnapshot().messages[0].status, 'failed');
  const key = widget.getSnapshot().messages[0].clientMessageId;
  fail = false; await widget.retryMessage(key);
  assert.equal(widget.getSnapshot().messages.length, 1);
  assert.equal(widget.getSnapshot().messages[0].status, 'sent');
  const sends = f.calls.filter(c => c.name === 'chat_send_message');
  assert.equal(sends.length, 2);
  assert.equal(new Set(sends.map(c => c.args.p_client_message_id)).size, 1);
  widget.close(); f.channels[0].state('CHANNEL_ERROR');
  assert.equal(widget.getSnapshot().connection.phase, 'reconnecting');
  const response = row(2, { sender: 'responder' });
  f.setRows([row(1, { body: 'Retry safely', client_message_id: key }), response]);
  const reads = f.calls.filter(c => c.name === 'chat_list_messages').length;
  f.channels[0].state('SUBSCRIBED'); await tick();
  assert.equal(widget.getSnapshot().connection.phase, 'ready');
  assert.ok(f.calls.filter(c => c.name === 'chat_list_messages').length > reads);
  f.channels[0].event({ new: response });
  assert.equal(widget.getSnapshot().messages.length, 2);
  assert.equal(widget.getSnapshot().unread, 1);
  assert.equal(f.channels.length - f.removed.length, 1);
  unmount(); await tick();
});

test('existing Auth session skips anonymous signup; history follows SUBSCRIBED', async () => {
  const f = fixture({ manualSubscribe: true, rows: [row(1)] });
  const pending = f.transport.initialize(); await tick();
  assert.equal(f.signIns(), 0);
  assert.equal(f.calls.some(c => c.name === 'chat_list_messages'), false);
  assert.deepEqual({ ...f.channels[0].binding }, { schema: 'public', table: 'chat_messages', event: 'INSERT', filter: `session_id=eq.${sid}` });
  f.channels[0].event({ new: row(2, { sender: 'responder' }) });
  f.channels[0].state('SUBSCRIBED'); await pending;
  assert.equal(f.transport.getSnapshot().messages.length, 2);
  assert.equal(f.transport.getSnapshot().messages[1].sender, 'responder');
  assert.ok(f.events.indexOf('realtime-auth') < f.events.indexOf('subscribe'));
  await f.transport.dispose();
});

test('client key persists across instances, repairs invalid UUID and fails safely without storage', () => {
  const s = storage(); let count = 0;
  const create = () => { count++; return uuid(count); };
  assert.equal(getChatClientKey(s, create), uuid(1));
  assert.equal(getChatClientKey(s, create), uuid(1)); assert.equal(count, 1);
  s.setItem(CHAT_CLIENT_KEY, 'not-a-uuid'); assert.equal(getChatClientKey(s, create), uuid(2));
  assert.throws(() => getChatClientKey({ getItem() { throw Error('private'); } }, create), e => e.code === 'storage_unavailable');
});

test('history and older pages are normalized and malformed sender/session is rejected', async () => {
  const f = fixture({ rows: [row(1), row(2)] }); await f.transport.initialize();
  const older = await f.transport.loadOlder(row(2).created_at, 1);
  assert.equal(older.length, 1); assert.equal(older[0].clientMessageId, row(1).client_message_id);
  assert.equal(f.transport.getSnapshot().messages.length, 2);
  const call = f.calls.at(-1); assert.equal(call.args.p_limit, 1); assert.equal(call.args.p_before, row(2).created_at);
  for (const value of [row(3, { sender: 'system' }), row(3, { session_id: uuid(999) }), row(3, { created_at: null })]) {
    assert.throws(() => normalizeMessage(value, sid), e => e.code === 'invalid_response');
  }
  await assert.rejects(listChatMessages(f.client, sid, { limit: 201 }), e => e.code === 'invalid_limit');
  await f.transport.dispose();
});

test('history availability exposes one bounded initial page and the end of older history', async () => {
  const f = fixture({ rows: Array.from({ length: 250 }, (_, i) => row(i + 1)) });
  await f.transport.initialize();
  assert.equal(f.transport.getSnapshot().historyLoaded, true);
  assert.equal(f.transport.getSnapshot().messages.length, 200);
  assert.equal(f.transport.getSnapshot().hasOlderMessages, true);
  await f.transport.loadOlder(f.transport.getSnapshot().messages[0].createdAt, 100);
  assert.equal(f.transport.getSnapshot().messages.length, 250);
  assert.equal(f.transport.getSnapshot().hasOlderMessages, false);
  await f.transport.dispose();
});

test('initial history failure is classified separately from connection and send failures', async () => {
  const f = fixture({ handler: name => name === 'chat_list_messages' ? { data: null, error: { message: 'Failed to fetch' } } : undefined });
  await assert.rejects(f.transport.initialize(), e => e.code === 'network');
  assert.equal(f.transport.getSnapshot().errorSource, 'history');
  await f.transport.dispose();
});

test('send uses only RPC arguments, trims text and unifies echo, result history and repeated history', async () => {
  const f = fixture(); await f.transport.initialize();
  const message = f.transport.prepareMessage('  Hello  ');
  const id = await f.transport.send(message);
  const call = f.calls.find(c => c.name === 'chat_send_message');
  assert.deepEqual({ ...call.args }, { p_session_id: sid, p_client_message_id: message.clientMessageId, p_body: 'Hello' });
  assert.equal(call.retry, false); assert.equal(f.transport.getSnapshot().messages[0].id, id);
  f.channels[0].event({ new: row(1, { body: 'Hello', client_message_id: message.clientMessageId }) });
  await f.transport.refreshHistory(); assert.equal(f.transport.getSnapshot().messages.length, 1);
  f.channels[0].event({ new: row(2, { sender: 'responder', client_message_id: message.clientMessageId }) });
  assert.equal(f.transport.getSnapshot().messages.length, 2);
  await f.transport.dispose();
});

test('manual retry after an unknown send result retains UUID and does not create a duplicate', async () => {
  const f = fixture(); await f.transport.initialize();
  const draft = f.transport.prepareMessage('Keep this text'); let attempted = 0;
  f.setHandler((name, args) => {
    if (name !== 'chat_send_message') return;
    attempted++;
    if (attempted === 1) {
      f.setRows([row(1, { body: args.p_body, client_message_id: args.p_client_message_id })]);
      return { data: null, error: { message: 'Failed to fetch', details: 'private SQL' } };
    }
  });
  await assert.rejects(f.transport.send(draft), e => e.code === 'network');
  await tick(); assert.equal(attempted, 1, 'No automatic mutation retry');
  assert.equal(await f.transport.send(draft), row(1).id);
  const calls = f.calls.filter(c => c.name === 'chat_send_message');
  assert.equal(calls[0].args.p_client_message_id, calls[1].args.p_client_message_id);
  assert.equal(f.transport.getSnapshot().messages.length, 1);
  await assert.rejects(f.transport.send({ ...draft, body: 'Changed text' }), e => e.code === 'invalid_message');
  await f.transport.dispose();
});

test('double send shares one pending RPC; confirmation is retained if history reload fails', async () => {
  const f = fixture(); await f.transport.initialize(); const gate = deferred();
  f.setHandler(name => name === 'chat_send_message' ? gate.promise : { data: null, error: { message: 'network failure' } });
  const draft = f.transport.prepareMessage('Hello');
  const first = f.transport.send(draft); assert.equal(f.transport.send(draft), first);
  assert.equal(f.calls.filter(c => c.name === 'chat_send_message').length, 1);
  gate.resolve({ data: uuid(555), error: null }); assert.equal(await first, uuid(555));
  assert.equal(f.transport.getSnapshot().error.code, 'network');
  await f.transport.dispose();
});

test('message validation rejects whitespace and >4000 characters, permits 4000 Unicode codepoints', () => {
  assert.throws(() => messageBody('  \n '), e => e.code === 'invalid_message');
  assert.throws(() => messageBody('x'.repeat(4001)), e => e.code === 'invalid_message');
  assert.equal(messageBody('🙂'.repeat(4000)).length, 8000);
});

test('dedup is by id then sender/key, chronological sort preserves microseconds and id tiebreaker', () => {
  const a = normalizeMessage(row(1), sid), b = normalizeMessage(row(2), sid);
  const sameKey = normalizeMessage(row(3, { client_message_id: a.clientMessageId }), sid);
  const response = normalizeMessage(row(4, { sender: 'responder', client_message_id: a.clientMessageId }), sid);
  const sameTime = normalizeMessage(row(9, { created_at: a.createdAt }), sid);
  const merged = mergeMessages([b], [response, a, a, sameKey, sameTime]);
  assert.equal(merged.map(m => m.id).join(','), [a, sameTime, b, response].map(m => m.id).join(','));
});

test('reconnect rereads multiple missed pages before checkpoint, without polling', async () => {
  const f = fixture({ rows: [row(1)] }); await f.transport.initialize();
  f.channels[0].state('CHANNEL_ERROR'); assert.equal(f.transport.getSnapshot().phase, 'reconnecting');
  f.setRows(Array.from({ length: 450 }, (_, i) => row(i + 1)));
  const before = f.calls.length;
  f.channels[0].state('SUBSCRIBED');
  await tick(); await tick();
  assert.equal(f.transport.getSnapshot().messages.length, 450);
  assert.equal(f.calls.slice(before).filter(c => c.name === 'chat_list_messages').length, 3);
  assert.equal(f.transport.getSnapshot().phase, 'ready');
  await tick(); assert.equal(f.calls.length, before + 3);
  await f.transport.dispose();
});

test('reconnect from an initially empty conversation also recovers more than one missed page', async () => {
  const f = fixture(); await f.transport.initialize();
  f.channels[0].state('TIMED_OUT');
  f.setRows(Array.from({ length: 450 }, (_, i) => row(i + 1)));
  f.channels[0].state('SUBSCRIBED'); await tick(); await tick();
  assert.equal(f.transport.getSnapshot().messages.length, 450);
  await f.transport.dispose();
});

test('explicit initialization while reconnecting replaces channel and ignores old callbacks', async () => {
  const f = fixture(); await f.transport.initialize(); const old = f.channels[0];
  old.state('CHANNEL_ERROR'); await f.transport.initialize();
  assert.equal(f.channels.length, 2); assert.equal(f.removed[0], old);
  old.event({ new: row(1) }); old.state('CHANNEL_ERROR');
  assert.equal(f.transport.getSnapshot().phase, 'ready'); assert.equal(f.transport.getSnapshot().messages.length, 0);
  await f.transport.dispose();
});

test('missing environment fails initialization without any client/network operation', async () => {
  const transport = new ChatTransport({ getClient: () => { throw toChatError({ message: 'not_configured' }); } });
  await assert.rejects(transport.initialize(), e => e.code === 'not_configured');
  assert.equal(transport.getSnapshot().phase, 'error');
  await transport.dispose();
});

test('subscription timeout removes channel and history is never requested', async () => {
  const f = fixture({ manualSubscribe: true });
  await assert.rejects(f.transport.initialize(), e => e.code === 'realtime');
  await tick(); assert.equal(f.removed.length, 1);
  assert.equal(f.calls.some(c => c.name === 'chat_list_messages'), false);
  await f.transport.dispose();
});

test('dispose removes channel and Auth listener; late events/read results cannot repopulate state', async () => {
  const f = fixture(); await f.transport.initialize(); const gate = deferred();
  f.setHandler(name => name === 'chat_list_messages' ? gate.promise : undefined);
  const refreshing = f.transport.refreshHistory(); await tick();
  await f.transport.dispose(); assert.equal(f.removed.length, 1); assert.equal(f.authListeners.size, 0);
  f.channels[0].event({ new: row(1) }); f.channels[0].state('SUBSCRIBED');
  gate.resolve({ data: [row(1)], error: null });
  await assert.rejects(refreshing, e => e.code === 'cancelled');
  assert.equal(f.transport.getSnapshot().phase, 'idle'); assert.equal(f.transport.getSnapshot().messages.length, 0);
});

test('dispose during authentication prevents subsequent RPC/subscription', async () => {
  const gate = deferred(), f = fixture({ noSession: true, authGate: gate.promise });
  const starting = f.transport.initialize(); await tick(); await f.transport.dispose(); gate.resolve();
  await assert.rejects(starting, e => e.code === 'cancelled');
  assert.equal(f.calls.length, 0); assert.equal(f.channels.length, 0);
});

test('sign-out or identity change invalidates conversation and closes channel', async () => {
  for (const next of [null, { ...authSession, user: { id: uuid(999) } }]) {
    const f = fixture({ rows: [row(1)] }); await f.transport.initialize();
    f.changeAuth(next); await tick();
    assert.equal(f.transport.getSnapshot().error.code, 'not_authenticated');
    assert.equal(f.transport.getSnapshot().messages.length, 0); assert.equal(f.removed.length, 1);
    await assert.rejects(f.transport.send({ sessionId: sid, clientMessageId: uuid(777), body: 'No' }), e => e.code === 'not_authenticated');
  }
});

test('anonymous-provider and subscription failures stop initialization with safe errors', async () => {
  const f = fixture({ noSession: true, authError: { code: 'anonymous_provider_disabled', message: 'internal details' } });
  await assert.rejects(f.transport.initialize(), e => e.code === 'anonymous_provider_disabled');
  assert.equal(f.calls.length, 0);
  const g = fixture({ manualSubscribe: true });
  const starting = g.transport.initialize(); await tick(); g.channels[0].state('CHANNEL_ERROR');
  await assert.rejects(starting, e => e.code === 'realtime'); await tick();
  assert.equal(g.removed.length, 1); assert.equal(g.calls.some(c => c.name === 'chat_list_messages'), false);
  await g.transport.dispose();
});

test('safe error mapping hides raw SQL, stack and arbitrary hints for every backend code', () => {
  for (const code of ['not_authenticated', 'forbidden', 'session_not_found', 'invalid_client_key', 'invalid_message', 'invalid_limit']) {
    const safe = toChatError({ code: 'P0001', message: code, hint: 'body', details: 'SELECT private', stack: 'secret stack' });
    assert.equal(safe.code, code); assert.equal(safe.field, 'body'); assert.ok(!safe.message.includes('SELECT'));
  }
  assert.equal(toChatError({ code: '42501' }).code, 'forbidden');
  assert.equal(toChatError({ message: 'SQL secret', hint: 'private-table' }).field, undefined);
  assert.equal(toChatError({ message: 'SQL secret' }).code, 'unknown');
});

test('missing config and nonpublic keys fail closed; anon and publishable credentials are accepted', () => {
  const url = 'https://example.supabase.co';
  assert.throws(() => chatConfig('', ''), e => e.code === 'not_configured');
  const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.throws(() => chatConfig(url, jwt('service_role')), e => e.code === 'invalid_configuration');
  assert.throws(() => chatConfig(url, 'sb_secret_synthetic'), e => e.code === 'invalid_configuration');
  assert.equal(chatConfig(url, jwt('anon')).url, url);
  assert.equal(chatConfig(url, 'sb_publishable_synthetic').url, url);
  assert.throws(() => chatConfig('javascript:bad', 'sb_publishable_synthetic'), e => e.code === 'invalid_configuration');
});

test('client isolation and import-only entry point contain no startup network work or prohibited calls', () => {
  const client = readFileSync(path.join(root, 'src/lib/chatSupabase.ts'), 'utf8');
  assert.match(client, /chat\.database\.types/);
  assert.match(client, /storageKey: 'apex-chat-auth:v1'/);
  assert.match(client, /detectSessionInUrl: false/);
  assert.match(client, /persistSession: true/); assert.match(client, /autoRefreshToken: true/);
  const api = readFileSync(path.join(root, 'src/chat/api.ts'), 'utf8');
  assert.doesNotMatch(api, /chat_add_response|_chat_|\.from\(|\.insert\(|\.update\(/);
  const entry = readFileSync(path.join(root, 'src/chat/index.ts'), 'utf8');
  assert.doesNotMatch(entry, /chatTransport\.initialize\(/);
});

test('confirmed visitor send triggers reply in the background', async () => {
  const gate = deferred(), requests = [];
  const f = fixture({ requestReply: async (_client, sessionId, messageId) => {
    requests.push({ sessionId, messageId }); await gate.promise;
  } });
  await f.transport.initialize();
  const sentId = await f.transport.send(f.transport.prepareMessage('Synthetic question'));
  assert.equal(requests.length, 1); assert.equal(requests[0].messageId, sentId);
  assert.equal(f.transport.getSnapshot().replyPending, true);
  gate.resolve(); await tick();
  assert.equal(f.transport.getSnapshot().replyPending, false);
  await f.transport.dispose();
});

test('reply retry reuses stored message ID without resending visitor text', async () => {
  let attempts = 0; const ids = [];
  const f = fixture({ requestReply: async (_client, _sessionId, id) => {
    ids.push(id); if (++attempts === 1) throw new Error('Synthetic network failure');
  } });
  await f.transport.initialize();
  await f.transport.send(f.transport.prepareMessage('Synthetic question'));
  await tick();
  assert.equal(f.transport.getSnapshot().replyError.code, 'response_unavailable');
  assert.equal(f.transport.getSnapshot().messages.length, 1);
  await f.transport.retryReplies();
  assert.equal(ids.length, 2); assert.equal(ids[0], ids[1]);
  assert.equal(f.calls.filter(call => call.name === 'chat_send_message').length, 1);
  assert.equal(f.transport.getSnapshot().replyError, null);
  await f.transport.dispose();
});

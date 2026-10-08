import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { createChatWidgetMock, chatRow, chatUuid } from './helpers/chatWidgetMock.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)), cache = new Map();
const read = file => readFileSync(path.join(root, file), 'utf8');
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  vm.runInNewContext(code, { exports, URLSearchParams, require: name => {
    assert.ok(name.startsWith('.')); return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
  } }, { filename: relative });
  return exports;
}
const { ChatWidgetController, combineVisibleMessages, shouldSendOnEnter, isNearBottom } = load('src/chat/widget/controller.ts');
const { canShowChat } = load('src/chat/widget/routePolicy.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture(initial) {
  const mock = createChatWidgetMock(initial), controller = new ChatWidgetController(mock.transport, () => '2026-10-08T10:00:00Z');
  const cleanup = controller.mount();
  return { ...mock, controller, cleanup };
}

test('widget mounts without Auth; first open initializes once and closing preserves subscription', async () => {
  const f = fixture(); assert.equal(f.calls.initialize, 0);
  f.controller.open(); assert.equal(f.controller.getSnapshot().open, true);
  assert.equal(f.controller.getSnapshot().connection.phase, 'connecting'); await tick();
  assert.equal(f.controller.getSnapshot().connection.phase, 'ready');
  f.controller.close(); assert.equal(f.controller.getSnapshot().open, false);
  assert.equal(f.calls.dispose, 0); f.controller.open(); await tick();
  assert.equal(f.calls.initialize, 1); f.cleanup(); assert.equal(f.calls.dispose, 1);
});

test('empty history and saved history are distinct; restored responses are not unread notifications', async () => {
  for (const initial of [[], [chatRow(1), chatRow(2, 'visitor')]]) {
    const f = fixture(initial); f.controller.open(); f.controller.close(); await tick();
    assert.equal(f.controller.getSnapshot().messages.length, initial.length);
    assert.equal(f.controller.getSnapshot().unread, 0); f.cleanup();
  }
});

test('mounting against an already initialized transport restores visible history without counting it unread', async () => {
  const mock = createChatWidgetMock([chatRow(1)]); await mock.transport.initialize();
  const controller = new ChatWidgetController(mock.transport); const cleanup = controller.mount();
  assert.equal(controller.getSnapshot().messages.length, 1);
  assert.equal(controller.getSnapshot().unread, 0); cleanup();
});

test('optimistic send is single-flight, preserves newly typed draft and reconciles echo', async () => {
  const f = fixture(); f.controller.open(); await tick(); const gate = deferred(); f.setSendGate(gate.promise);
  f.controller.setDraft('  First\nmessage  ');
  const pending = f.controller.sendDraft(); void f.controller.sendDraft();
  assert.equal(f.calls.prepare, 1); assert.equal(f.calls.send.length, 1);
  assert.equal(f.controller.getSnapshot().messages[0].status, 'sending');
  f.controller.setDraft('Next message'); gate.resolve(); await pending;
  assert.equal(f.controller.getSnapshot().draft, 'Next message');
  assert.equal(f.controller.getSnapshot().messages.length, 1);
  assert.equal(f.controller.getSnapshot().messages[0].status, 'sent');
  assert.equal(f.controller.getSnapshot().messages[0].body, 'First\nmessage'); f.cleanup();
});

test('confirmed send clears unchanged draft; network retry reuses the exact prepared UUID', async () => {
  const f = fixture(); f.controller.open(); await tick();
  f.controller.setDraft('Retry me'); f.failNextSend(); await f.controller.sendDraft();
  const key = f.calls.send[0].clientMessageId;
  assert.equal(f.controller.getSnapshot().messages[0].status, 'failed'); assert.equal(f.controller.getSnapshot().draft, 'Retry me');
  await f.controller.retryMessage(key);
  assert.equal(f.calls.prepare, 1); assert.equal(f.calls.send[1].clientMessageId, key);
  assert.equal(f.controller.getSnapshot().draft, ''); assert.equal(f.controller.getSnapshot().messages.length, 1); f.cleanup();
});

test('pressing Send again on unchanged failed text retries instead of allocating another key', async () => {
  const f = fixture(); f.controller.open(); await tick();
  f.controller.setDraft('Retry'); f.failNextSend(); await f.controller.sendDraft(); await f.controller.sendDraft();
  assert.equal(f.calls.prepare, 1); assert.equal(f.calls.send[0].clientMessageId, f.calls.send[1].clientMessageId); f.cleanup();
});

test('IME and Shift+Enter do not send; plain Enter sends; empty input makes no request', async () => {
  assert.equal(shouldSendOnEnter({ key: 'Enter', shiftKey: false }), true);
  assert.equal(shouldSendOnEnter({ key: 'Enter', shiftKey: true }), false);
  assert.equal(shouldSendOnEnter({ key: 'Enter', shiftKey: false, isComposing: true }), false);
  assert.equal(shouldSendOnEnter({ key: 'Enter', shiftKey: false, keyCode: 229 }), false);
  const f = fixture(); f.controller.open(); await tick(); f.controller.setDraft(' \n '); await f.controller.sendDraft();
  assert.equal(f.calls.send.length, 0); assert.equal(f.controller.getSnapshot().formError, 'invalid_message');
  f.controller.setDraft('x'.repeat(4001)); assert.equal(f.controller.getSnapshot().draft.length, 4000);
  await f.controller.sendDraft(); assert.equal(f.calls.send[0].body.length, 4000); f.cleanup();
});

test('Realtime response is visible once; closed chat counts only new responses and resets on open', async () => {
  const f = fixture([chatRow(1)]); f.controller.open(); await tick();
  f.reply('New reply'); assert.equal(f.controller.getSnapshot().messages.length, 2);
  assert.equal(f.controller.getSnapshot().announcement, 1); assert.equal(f.controller.getSnapshot().unread, 0);
  f.controller.close(); f.reply('While closed'); assert.equal(f.controller.getSnapshot().unread, 1);
  assert.equal(f.controller.getSnapshot().open, false);
  f.emit({ messages: [...f.transport.getSnapshot().messages] }); assert.equal(f.controller.getSnapshot().unread, 1);
  f.controller.open(); assert.equal(f.controller.getSnapshot().unread, 0); assert.equal(f.calls.initialize, 1); f.cleanup();
});

test('reconciliation considers id and visitor/key but keeps responder with the same key', () => {
  const server = chatRow(1, 'visitor'), prepared = { sessionId: server.sessionId, clientMessageId: server.clientMessageId, body: server.body };
  const local = { prepared, createdAt: server.createdAt, status: 'sending' };
  const visible = combineVisibleMessages([server, { ...chatRow(2), clientMessageId: server.clientMessageId }], [local]);
  assert.equal(visible.length, 2); assert.equal(visible[0].status, 'sent');
  assert.equal(combineVisibleMessages([server], [{ ...local, prepared: { ...prepared, clientMessageId: chatUuid(2222) }, serverId: server.id }]).length, 1);
});

test('reader away from bottom sees new-messages action; older pagination is bounded and not unread', async () => {
  const f = fixture(Array.from({ length: 200 }, (_, i) => chatRow(i + 1)));
  f.controller.open(); await tick(); f.controller.setNearBottom(false); f.reply();
  assert.equal(f.controller.getSnapshot().newMessages, 1); f.controller.setNearBottom(true);
  assert.equal(f.controller.getSnapshot().newMessages, 0);
  f.controller.close(); await f.controller.loadOlder();
  assert.equal(f.calls.older.length, 1); assert.equal(f.calls.older[0].limit, 100);
  assert.equal(f.calls.older[0].before, chatRow(1).createdAt); assert.equal(f.controller.getSnapshot().unread, 0);
  await f.controller.loadOlder(); assert.equal(f.calls.older.length, 1);
  assert.equal(isNearBottom(900, 100, 1000), true); assert.equal(isNearBottom(300, 100, 1000), false); f.cleanup();
});

test('reconnection is explicit, history error retries reading, missing configuration is safe', async () => {
  const f = fixture(); f.setInitializationError({ code: 'not_configured' }); f.controller.open(); await tick();
  assert.equal(f.controller.getSnapshot().connection.phase, 'error');
  f.setInitializationError(null); await f.controller.reconnect();
  assert.equal(f.controller.getSnapshot().connection.phase, 'ready');
  f.emit({ phase: 'reconnecting', errorSource: 'connection', error: { code: 'realtime' } }); await f.controller.reconnect();
  assert.equal(f.calls.initialize, 3);
  f.emit({ errorSource: 'history', error: { code: 'network' } }); await f.controller.reconnect();
  assert.equal(f.calls.refresh, 1); f.cleanup();
});

test('all protected/auth paths and trees without public pages hide the widget, including legal consent', () => {
  for (const path of ['/admin', '/admin/stores/new', '/ADMIN/unknown', '/login', '/signup', '/signup/verify', '/reset-password', '/reset-password/new', '/cabinet']) {
    assert.equal(canShowChat(path, '', true), false);
  }
  for (const path of ['/pricing', '/stores', '/how-it-works', '/privacy', '/offer']) {
    assert.equal(canShowChat(path, '', true), true); assert.equal(canShowChat(path, '', false), false);
  }
  assert.equal(canShowChat('/privacy', '?returnTo=%2Fsignup', true), false);
  const routes = read('src/routes/public.tsx'); assert.equal((routes.match(/element: <ChatRouteLayout/g) ?? []).length, 1);
  assert.ok(routes.includes('handle: { publicChat: true }'));
});

test('rendering remains safe Markdown and accessible; responsive bounds and translations are present', () => {
  const view = read('src/chat/widget/ChatWidget.tsx'), css = read('src/chat/widget/ChatWidget.module.css');
  assert.doesNotMatch(view, /dangerouslySetInnerHTML|innerHTML|chat_add_response|\.rpc\(|\.insert\(/);
  for (const text of ['role="dialog"', 'aria-live="polite"', 'aria-expanded=', 'htmlFor="apex-chat-input"', 'maxLength={4000}', "event.key === 'Escape'", 'launcher.current?.focus()', 'shouldSendOnEnter']) assert.ok(view.includes(text));
  assert.ok(css.includes('100dvh')); assert.ok(css.includes('max-width: 600px')); assert.ok(read('src/chat/widget/ChatMarkdown.tsx').includes('skipHtml')); assert.ok(read('src/chat/widget/ChatMarkdown.tsx').includes('remarkBreaks'));  assert.ok(css.includes(':focus-visible'));
  const keys = object => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? keys(value).map(n => `${key}.${n}`) : [key]).sort();
  const dictionaries = ['ru', 'kk', 'en'].map(lang => JSON.parse(read(`src/i18n/chat.${lang}.json`)));
  assert.deepEqual(keys(dictionaries[0]), keys(dictionaries[1])); assert.deepEqual(keys(dictionaries[0]), keys(dictionaries[2]));
});

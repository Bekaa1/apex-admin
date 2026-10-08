import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

// Execute the actual components with controlled hook/Auth boundaries. No DOM,
// env files, network, second Supabase client, or additional test framework.
const require = createRequire(import.meta.url);
function loadTs(file, modules = {}, globals = {}) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    if (name === 'react/jsx-runtime') return require(name);
    if (name in modules) return modules[name];
    throw new Error('Unexpected dependency: ' + name);
  }, ...globals }, { filename: file });
  return exports;
}
const access = loadTs('src/auth/adminAccess.ts');
const session = (id = 'synthetic-a', expiresAt = 200) => ({ user: { id }, expires_at: expiresAt });
function guard(auth, query = {}, configured = true, rpcResult = { data: true, error: null }) {
  let options;
  let rpcCalls = 0;
  const client = { rpc: (name) => {
    assert.equal(name, 'is_apex_admin'); rpcCalls++;
    return { abortSignal: (signal) => { assert.ok(signal); return Promise.resolve(rpcResult); } };
  } };
  const { RequireAdmin } = loadTs('src/auth/RequireAdmin.tsx', {
    '@tanstack/react-query': { useQuery: (value) => { options = value; return { isPending: false, isFetching: false, isError: false, data: undefined, ...query }; } },
    'react-router': { Navigate: 'Navigate', Outlet: 'Outlet' },
    '../design-system': { Alert: 'Alert', Button: 'Button', Skeleton: 'Skeleton' },
    '../i18n/i18n': { useI18n: () => ({ t: (key) => key }) },
    '../lib/supabase': { supabase: configured ? client : null, requireSupabase: () => client },
    '../navigation/RouteState': { RouteFrame: 'RouteFrame' },
    './useAuthSession': { useAuthSession: () => auth },
    './adminAccess': access,
  });
  return { element: RequireAdmin(), options, rpcCalls: () => rpcCalls };
}
test('RequireAdmin: no session redirects to login without role request', () => {
  const result = guard({ status: 'ready', session: null });
  assert.equal(result.element.type, 'Navigate');
  assert.equal(result.element.props.to, '/login');
  assert.equal(result.options.enabled, false);
  assert.equal(result.rpcCalls(), 0);
});
test('RequireAdmin: session loading and pending/refetching role never render Outlet', () => {
  for (const [auth, query] of [
    [{ status: 'loading', session: null }, {}],
    [{ status: 'ready', session: session() }, { isPending: true }],
    [{ status: 'ready', session: session() }, { isFetching: true, data: true }],
  ]) {
    const result = guard(auth, query);
    assert.equal(result.element.type, 'RouteFrame');
    assert.equal(result.element.props.children.props.role, 'status');
  }
});
test('RequireAdmin: only literal true opens Outlet', () => {
  assert.equal(guard({ status: 'ready', session: session() }, { data: true }).element.type, 'Outlet');
  for (const data of [false, null, undefined, 'true', 1, {}, []]) {
    const result = guard({ status: 'ready', session: session() }, { data });
    assert.equal(result.element.type, 'Navigate');
    assert.equal(result.element.props.to, '/access-denied');
  }
});
test('RequireAdmin: error hides cached success and offers retry', () => {
  let retries = 0;
  const result = guard({ status: 'ready', session: session() }, { isError: true, data: true, refetch: () => { retries++; } });
  assert.equal(result.element.type, 'RouteFrame');
  const button = result.element.props.children.find((child) => child.type === 'Button');
  button.props.onClick();
  assert.equal(retries, 1);
  assert.equal(guard({ status: 'error', session: null }, { data: true }).element.type, 'RouteFrame');
});
test('RequireAdmin: missing environment closes access and disables RPC', () => {
  const result = guard({ status: 'ready', session: session() }, { data: true }, false);
  assert.equal(result.element.type, 'RouteFrame');
  assert.equal(result.element.props.children.props.title, 'adminAuth.notConfigured');
  assert.equal(result.options.enabled, false);
});
test('RequireAdmin: existing RPC uses signal, no automatic retry, key includes current identity/expiry', async () => {
  const result = guard({ status: 'ready', session: session() });
  assert.equal(result.options.enabled, true);
  assert.equal(result.options.retry, false);
  assert.equal(result.options.gcTime, 0);
  assert.equal(JSON.stringify(result.options.queryKey), JSON.stringify(['admin-access', 'synthetic-a', 200]));
  assert.equal(await result.options.queryFn({ signal: new AbortController().signal }), true);
  const bad = guard({ status: 'ready', session: session() }, {}, true, { data: 'true', error: null });
  assert.equal(await bad.options.queryFn({ signal: new AbortController().signal }), false);
  const missing = guard({ status: 'ready', session: session() }, {}, true, { data: null, error: { code: 'PGRST202' } });
  await assert.rejects(missing.options.queryFn({ signal: new AbortController().signal }), (error) => error.code === 'PGRST202');
});

function providerFixture() {
  const queryClient = new QueryClient();
  let state, cleanup, notify, resolveRead;
  let now = 100_000;
  const timers = new Map();
  const listeners = new Map();
  const events = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) };
  const { AuthSessionProvider } = loadTs('src/auth/AuthSessionProvider.tsx', {
    react: { useState: (initial) => { state = initial; return [state, (next) => { state = next; }]; }, useEffect: (fn) => { cleanup = fn(); } },
    '@tanstack/react-query': { useQueryClient: () => queryClient },
    '../lib/supabase': { supabase: { auth: {
      onAuthStateChange: (fn) => { notify = fn; return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: () => new Promise((resolve) => { resolveRead = resolve; }),
    } } },
    './useAuthSession': { AuthSessionContext: { Provider: 'Provider' } },
    './adminAccess': access,
  }, { window: events, document: events, Date: { now: () => now },
    setTimeout: (fn, delay) => { const id = {}; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  AuthSessionProvider({ children: null });
  return { queryClient, state: () => state, notify: (value) => notify('SYNTHETIC_EVENT', value),
    resolveRead: (value) => resolveRead(value), listeners,
    advance: (milliseconds) => { now += milliseconds; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } },
    cleanup: () => { cleanup(); queryClient.clear(); },
  };
}
test('session provider clears administrative data and role on user change and sign-out', () => {
  const f = providerFixture();
  try {
    f.notify(session('synthetic-a'));
    f.queryClient.setQueryData(['admin-access', 'synthetic-a'], true);
    f.queryClient.setQueryData(['admin', 'rows'], ['synthetic']);
    f.notify(session('synthetic-b'));
    assert.equal(f.state().session.user.id, 'synthetic-b');
    assert.equal(f.queryClient.getQueryCache().getAll().length, 0);
    f.queryClient.setQueryData(['admin-access', 'synthetic-b'], true);
    f.notify(null);
    assert.equal(f.state().session, null);
    assert.equal(f.queryClient.getQueryCache().getAll().length, 0);
  } finally { f.cleanup(); }
});
test('session expiry closes access without an Auth event; token renewal reschedules expiry', () => {
  const f = providerFixture();
  try {
    f.notify(session('synthetic-a', 101));
    f.advance(500);
    f.notify(session('synthetic-a', 103));
    f.advance(500);
    assert.ok(f.state().session);
    f.queryClient.setQueryData(['admin-access'], true);
    f.advance(2000);
    assert.equal(f.state().session, null);
    assert.equal(f.queryClient.getQueryCache().getAll().length, 0);
    f.notify(session('synthetic-a', 102));
    assert.equal(f.state().session, null);
  } finally { f.cleanup(); }
  assert.equal(f.listeners.size, 0);
});
test('stale getSession cannot restore the prior user after an Auth event', async () => {
  const f = providerFixture();
  try {
    f.notify(session('synthetic-b'));
    f.resolveRead({ data: { session: session('synthetic-a') }, error: null });
    await Promise.resolve();
    assert.equal(f.state().session.user.id, 'synthetic-b');
  } finally { f.cleanup(); }
});
test('session read failure removes cached access and shows error', async () => {
  const f = providerFixture();
  try {
    f.queryClient.setQueryData(['admin-access'], true);
    f.resolveRead({ data: { session: null }, error: new Error('synthetic') });
    await Promise.resolve();
    assert.equal(f.state().status, 'error');
    assert.equal(f.queryClient.getQueryCache().getAll().length, 0);
  } finally { f.cleanup(); }
});

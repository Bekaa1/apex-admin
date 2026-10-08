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
const permissions = loadTs('src/auth/permissions.ts');
test('role matrix denies financial/admin actions to moderator and ordinary users', () => {
  for (const role of ['client', 'manager', 'director', 'marketer', 'moderator']) {
    assert.equal(permissions.can([role], 'invoices'), false);
    assert.equal(permissions.can([role], 'team'), false);
  }
  assert.equal(permissions.can(['moderator'], 'moderate'), true);
  assert.equal(permissions.can(['accountant'], 'moderate'), false);
  assert.equal(permissions.can(['accountant'], 'invoices'), true);
  assert.equal(permissions.can(['moderator', 'accountant'], 'invoices'), true);
  for (const role of ['admin', 'owner']) assert.equal(permissions.can([role], 'team'), true);
  assert.equal(permissions.can(permissions.parseRoles(['unknown']), 'panel'), false);
  for (const value of [true, false, null, {}, ['admin', 1]]) assert.throws(() => permissions.parseRoles(value));
});

test('matched route permissions protect invoices and unknown routes before children mount', () => {
  let handles = [], roles = ['moderator'];
  const { RequireAdminSection } = loadTs('src/auth/RequirePermission.tsx', {
    'react-router': { Navigate: 'Navigate', Outlet: 'Outlet', useMatches: () => handles.map(handle => ({ handle })) },
    '../design-system': { Alert: 'Alert', Button: 'Button' },
    '../i18n/i18n': { useI18n: () => ({ t: key => key }) },
    './permissions': permissions,
    './usePermissions': { usePermissions: () => ({ roles, can: permission => permissions.can(roles, permission) }) },
  });
  handles = [{ adminPermission: 'invoices' }];
  assert.equal(RequireAdminSection().type.name, 'PermissionDenied');
  roles = ['accountant']; assert.equal(RequireAdminSection().type, 'Outlet');
  handles = []; assert.equal(RequireAdminSection().type.name, 'PermissionDenied');
  handles = [{ admin404: true }]; assert.equal(RequireAdminSection().type, 'Outlet');
  handles = [{ adminHome: true }]; roles = ['director'];
  assert.equal(RequireAdminSection().props.to, '/admin/partner/stores');
});
const session = (id = 'synthetic-a', expiresAt = 200) => ({ user: { id }, expires_at: expiresAt });
function guard(auth, query = {}, configured = true, rpcResult = { data: ['admin'], error: null }) {
  let options;
  let rpcCalls = 0;
  const client = { rpc: (name) => {
    assert.equal(name, 'my_roles'); rpcCalls++;
    return { abortSignal: (signal) => { assert.ok(signal); return Promise.resolve(rpcResult); } };
  } };
  const { RequireAdmin } = loadTs('src/auth/RequireAdmin.tsx', {
    '@tanstack/react-query': { useQueryClient: () => new QueryClient(), useQuery: (value) => { options = value; return { isPending: false, isFetching: false, isError: false, data: undefined, ...query }; } },
    'react-router': { Navigate: 'Navigate', Outlet: 'Outlet' },
    '../design-system': { Alert: 'Alert', Button: 'Button', Skeleton: 'Skeleton' },
    '../i18n/i18n': { useI18n: () => ({ t: (key) => key }) },
    '../lib/supabase': { supabase: configured ? client : null, requireSupabase: () => client },
    '../navigation/RouteState': { RouteFrame: 'RouteFrame' },
    './useAuthSession': { useAuthSession: () => auth },
    './adminAccess': access,
    './permissions': permissions,
    './usePermissions': { PermissionsContext: { Provider: 'PermissionsProvider' } },
  }, { AbortSignal });
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
    [{ status: 'ready', session: session() }, { isFetching: true, data: ['admin'] }],
  ]) {
    const result = guard(auth, query);
    assert.equal(result.element.type, 'RouteFrame');
    assert.equal(result.element.props.children.props.role, 'status');
  }
});
test('RequireAdmin: only recognized panel roles open Outlet; clients and unknown roles stay denied', () => {
  for (const role of ['admin', 'owner', 'accountant', 'moderator', 'manager', 'director', 'marketer']) {
    const element = guard({ status: 'ready', session: session() }, { data: [role] }).element;
    assert.equal(element.type, 'PermissionsProvider');
    assert.equal(element.props.children.type, 'Outlet');
  }
  for (const data of [null, undefined, [], ['client'], ['unknown']]) {
    const result = guard({ status: 'ready', session: session() }, { data });
    assert.equal(result.element.type, 'Navigate');
    assert.equal(result.element.props.to, '/access-denied');
  }
});
test('RequireAdmin: error hides cached success and offers retry', () => {
  let retries = 0;
  const result = guard({ status: 'ready', session: session() }, { isError: true, data: ['admin'], refetch: () => { retries++; } });
  assert.equal(result.element.type, 'RouteFrame');
  const button = result.element.props.children.find((child) => child.type === 'Button');
  button.props.onClick();
  assert.equal(retries, 1);
  assert.equal(guard({ status: 'error', session: null }, { data: ['admin'] }).element.type, 'RouteFrame');
});
test('RequireAdmin: missing environment closes access and disables RPC', () => {
  const result = guard({ status: 'ready', session: session() }, { data: ['admin'] }, false);
  assert.equal(result.element.type, 'RouteFrame');
  assert.equal(result.element.props.children.props.title, 'adminAuth.notConfigured');
  assert.equal(result.options.enabled, false);
});
test('RequireAdmin: existing RPC uses signal, no automatic retry, key includes current identity/expiry', async () => {
  const result = guard({ status: 'ready', session: session() });
  assert.equal(result.options.enabled, true);
  assert.equal(result.options.retry, false);
  assert.equal(result.options.gcTime, 0);
  assert.equal(JSON.stringify(result.options.queryKey), JSON.stringify(['apex-permissions', 'synthetic-a', 200]));
  assert.equal(JSON.stringify(await result.options.queryFn({ signal: new AbortController().signal })), '["admin"]');
  const bad = guard({ status: 'ready', session: session() }, {}, true, { data: 'true', error: null });
  await assert.rejects(bad.options.queryFn({ signal: new AbortController().signal }), /Invalid permissions response/);
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

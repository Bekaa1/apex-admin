import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { matchRoutes } from 'react-router';
import { loadConfigFromFile } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const component = name => Object.defineProperty(() => null, 'name', { value: name });
const components = new Map();
const getComponent = name => {
  if (!components.has(name)) components.set(name, component(name));
  return components.get(name);
};
function evaluate(file, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(read(file), { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
  } }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (name in imports) return imports[name];
    if (name === 'react/jsx-runtime' || name === 'react-router') return require(name);
    if (name === '../auth/links') return evaluate('src/auth/links.tsx', { react: require('react') });
    if (name === '../admin/sections') return evaluate('src/admin/sections.ts');
    if (name === '../cabinet/sections') return evaluate('src/cabinet/sections.ts');
    // Renderable markers only. Never instantiate session providers, SDK or API.
    return new Proxy({}, { get: (_target, key) => getComponent(String(key)) });
  }, window: { history: { state: null } } }, { filename: file });
  return exports;
}
const adminRoutes = evaluate('src/routes/admin.tsx').routes;
const publicRoutes = evaluate('src/routes/public.tsx').routes;
const names = matches => matches.map(m => m.route.element?.type?.name).filter(Boolean);

test('public build preserves landing, auth and cabinet; admin URLs resolve only to neutral 404', () => {
  const root = matchRoutes(publicRoutes, '/');
  assert.equal(root.at(-1).route.element.type.name, 'Landing');
  assert.ok(names(root).includes('PublicLayout'));
  assert.equal(names(root).filter(n => n === 'ChatRouteLayout').length, 1);
  for (const url of ['/login', '/signup', '/signup/verify', '/signup/profile']) {
    const matches = matchRoutes(publicRoutes, url);
    assert.notEqual(matches.at(-1).route.path, '*');
    assert.notEqual(matches.at(-1).route.element.props.admin, true);
  }
  for (const url of ['/cabinet', '/cabinet/campaigns', '/cabinet/stats', '/cabinet/profile']) {
    assert.ok(names(matchRoutes(publicRoutes, url)).includes('RequireSession'));
  }
  for (const url of ['/admin', '/admin/invoices/example', '/access-denied', '/unknown']) {
    const matches = matchRoutes(publicRoutes, url);
    assert.equal(matches.at(-1).route.path, '*');
    assert.equal(matches.at(-1).route.element.type.name, 'RouteFrame');
    assert.notEqual(matches.at(-1).route.element.props.admin, true);
    assert.ok(!names(matches).includes('RequireAdmin'));
  }
});

test('admin build protects every admin route including nested owner and unknown routes; no public pages or widget', () => {
  assert.equal(matchRoutes(adminRoutes, '/').at(-1).route.element.props.to, '/admin');
  const login = matchRoutes(adminRoutes, '/login').at(-1).route.element;
  assert.equal(login.type.name, 'LoginFlow'); assert.equal(login.props.admin, true);
  for (const url of ['/admin', '/admin/campaigns', '/admin/campaigns/example', '/admin/invoices/example',
    '/admin/stores/new', '/admin/stores/new/example', '/admin/store-requests/pending', '/admin/store-requests/example/review', '/admin/unknown']) {
    const guards = names(matchRoutes(adminRoutes, url));
    assert.equal(guards.filter(n => n === 'RequireAdmin').length, 1, url);
    assert.ok(!guards.includes('ChatRouteLayout'));
  }
  assert.ok(names(matchRoutes(adminRoutes, '/admin/store-requests/pending')).includes('RequireStoreOwner'));
  for (const url of ['/signup', '/cabinet', '/pricing', '/stores', '/privacy']) {
    assert.equal(matchRoutes(adminRoutes, url).at(-1).route.path, '*');
  }
});

test('both route trees explicitly choose their recovery flow and contain one root fallback', () => {
  for (const [routes, admin] of [[adminRoutes, true], [publicRoutes, false]]) {
    assert.ok(routes[0].hydrateFallbackElement);
    for (const url of ['/reset-password', '/reset-password/code', '/reset-password/new', '/reset-password/done']) {
      const element = matchRoutes(routes, url).at(-1).route.element;
      assert.equal(element.type.name, 'ResetPasswordRoute');
      assert.equal(element.props.admin === true, admin);
    }
  }
});

test('public SMS recovery survives integration while missing admin configuration stays closed', () => {
  const reset = { channel: 'sms', contact: '+70000000000' };
  const exports = evaluate('src/auth/AuthRoutes.tsx', {
    'react-router': { ...require('react-router'), useLocation: () => ({ state: reset, search: '' }) },
    './routeState': { readResetPasswordState: () => reset },
    './useAuthSession': { useAuthSession: () => ({ session: null, status: 'anonymous' }) },
    '../i18n/i18n': { useI18n: () => ({ t: key => key }) },
    '../lib/supabase': { supabase: null },
    './validation': { validateEmail: () => null },
  });
  const publicScreen = exports.ResetPasswordRoute({ step: 'code' });
  assert.equal(publicScreen.type.name, 'ResetPasswordFlow');
  assert.equal(publicScreen.props.channel, 'sms');
  assert.notEqual(publicScreen.props.admin, true);
  const adminScreen = exports.ResetPasswordRoute({ step: 'code', admin: true });
  assert.equal(adminScreen.type.name, 'AuthLayout');
  assert.equal(adminScreen.props.admin, true);
});

test('Vite selects one route entry, matching metadata and isolated output for each app', async () => {
  for (const mode of ['public', 'admin', 'development', 'production']) {
    const result = await loadConfigFromFile({ command: 'build', mode });
    assert.ok(result);
    const app = mode === 'admin' ? 'admin' : 'public';
    assert.equal(result.config.build.outDir, `dist/${app}`);
    assert.ok(result.config.resolve.alias['@app/routes'].replaceAll('\\', '/').endsWith(`/src/routes/${app}.tsx`));
    const metadata = result.config.plugins.find(p => p.name === 'apex-app-metadata');
    const html = metadata.transformIndexHtml(read('index.html'));
    assert.ok(html.includes(app === 'admin' ? '<title>ApexAdmin</title>' : '<title>Apexmedia — реклама у полки</title>'));
    assert.ok(!html.includes('__APEX_'));
  }
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts.build, 'npm run build:public');
  assert.ok(scripts['build:admin'].includes('--mode admin'));
  assert.ok(scripts['build:public'].includes('--mode public'));
});

test('public landing still renders without Supabase configuration or video URLs', () => {
  const media = evaluate('src/landing/heroMedia.ts', { '../lib/supabase': { supabase: null } });
  assert.equal(media.heroMedia(), null);
  const { Landing } = evaluate('src/landing/Landing.tsx', {
    react: require('react'), './heroMedia': media,
    '../i18n/i18n': { useI18n: () => ({ t: key => key }) },
  });
  const html = renderToStaticMarkup(require('react').createElement(Landing));
  assert.ok(html.includes('landing.hero.titleBefore'));
  assert.ok(!html.includes('land__watch'));
});

test('configured landing retains all public video and poster sources without network requests', () => {
  const media = evaluate('src/landing/heroMedia.ts', { '../lib/supabase': { supabase: {
    storage: { from: bucket => {
      assert.equal(bucket, 'landing');
      return { getPublicUrl: path => ({ data: { publicUrl: `https://media.example/${path}` } }) };
    } },
  } } }).heroMedia();
  assert.ok(media.poster.src.endsWith('/hero/v1/poster.jpg'));
  assert.equal(media.loop.length, 2); assert.equal(media.full.length, 2);
  assert.ok(media.full[1].src.endsWith('/hero/v1/full-1080.mp4'));
});

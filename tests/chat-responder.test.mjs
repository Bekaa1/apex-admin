import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const message = { id: uuid(1), session_id: uuid(2), client_message_id: uuid(3),
  sender: 'visitor', body: 'Synthetic visitor message', created_at: '2026-10-08T10:00:00.000001Z' };
const config = { url: 'https://twnzsfsyrdnkjbkxpynl.supabase.co', serviceKey: 'synthetic-service', openRouterKey: 'synthetic-openrouter', model: 'google/gemini-2.5-flash-lite' };
function fixture(options = {}) {
  const calls = { generations: [], writes: [], reads: [] };
  let saved = Boolean(options.saved), saveAttempts = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: options.badAuth ? null : { id: uuid(4) } }, error: options.badAuth ? {} : null }) },
    from(table) {
      const filters = {};
      const query = {
        select: () => query, order: () => query, limit: () => query, maybeSingle: () => query,
        eq: (name, value) => { filters[name] = value; return query; },
        lte: (name, value) => { filters['lte.' + name] = value; return query; },
        retry: async enabled => {
          assert.equal(enabled, false);
          calls.reads.push({ table, filters });
          if (table === 'chat_sessions') return { data: options.foreign ? null : { id: uuid(2) }, error: null };
          if (filters.sender === 'responder') return { data: saved ? { id: uuid(9) } : null, error: null };
          if (filters.id) return { data: options.missing ? null : message, error: null };
          return { data: options.history ?? [message], error: null };
        },
      };
      return query;
    },
    rpc: (name, args) => ({ retry: async enabled => {
      assert.equal(enabled, false); assert.equal(name, 'chat_add_response');
      calls.writes.push(args); saveAttempts++;
      if (options.saveThenTimeout) { saved = true; return { error: { message: 'timeout' } }; }
      if (options.firstSaveFails && saveAttempts === 1) return { error: { message: 'timeout' } };
      saved = true; return { data: uuid(9), error: null };
    } }),
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../server/chat/responder.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  vm.runInNewContext(source, { exports, Buffer, AbortSignal,
    require: name => name === '@supabase/supabase-js' ? { createClient: () => client } : { supportPrompt: 'Synthetic support prompt' },
    fetch: async (url, init) => {
      assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
      calls.generations.push(JSON.parse(init.body));
      if (options.gate) await options.gate;
      return { ok: !options.generationError, status: options.generationError ? 503 : 200,
        json: async () => ({ choices: [{ message: { content: 'Synthetic answer' } }] }) };
    },
  });
  return { responder: new exports.ChatResponder(config), readConfig: exports.readConfig, calls };
}

test('server configuration is separate and fails closed for browser/Apex credentials', () => {
  const { readConfig } = fixture();
  assert.equal(readConfig({}), null);
  assert.throws(() => readConfig({ CHAT_SUPABASE_URL: config.url, CHAT_SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_test', OPENROUTER_API_KEY: 'sk-or-test' }));
  assert.throws(() => readConfig({ CHAT_SUPABASE_URL: 'https://other.supabase.co', CHAT_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test', OPENROUTER_API_KEY: 'sk-or-test' }));
});
test('auth is verified and session ownership is mandatory', async () => {
  for (const options of [{ badAuth: true }, { foreign: true }]) {
    const f = fixture(options);
    await assert.rejects(f.responder.authorize('synthetic-token', uuid(2)));
    assert.equal(f.calls.generations.length, 0);
  }
  const f = fixture();
  assert.equal(await f.responder.authorize('synthetic-token', uuid(2)), uuid(4));
  assert.equal(f.calls.reads[0].filters.visitor_user_id, uuid(4));
});
test('uses stored visitor text and saves only through RPC with stable client_message_id', async () => {
  const f = fixture();
  await f.responder.respond(uuid(4), uuid(2), uuid(1));
  const request = f.calls.generations[0];
  assert.equal(request.model, config.model); assert.equal(request.max_tokens, 600);
  assert.equal(request.messages[0].role, 'system');
  assert.equal(request.messages.at(-1).content, message.body);
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls.writes[0])), {
    p_session_id: uuid(2), p_client_message_id: uuid(3), p_body: 'Synthetic answer',
  });
});
test('saved answer skips the paid generation and second RPC', async () => {
  const f = fixture({ saved: true });
  await f.responder.respond(uuid(4), uuid(2), uuid(1));
  assert.equal(f.calls.generations.length, 0); assert.equal(f.calls.writes.length, 0);
});
test('concurrent duplicate requests share one generation', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = fixture({ gate });
  const first = f.responder.respond(uuid(4), uuid(2), uuid(1));
  const second = f.responder.respond(uuid(4), uuid(2), uuid(1));
  assert.equal(first, second); release(); await Promise.all([first, second]);
  assert.equal(f.calls.generations.length, 1); assert.equal(f.calls.writes.length, 1);
});
test('unknown save result rechecks the database without generating or writing again', async () => {
  const f = fixture({ saveThenTimeout: true });
  await f.responder.respond(uuid(4), uuid(2), uuid(1));
  assert.equal(f.calls.generations.length, 1); assert.equal(f.calls.writes.length, 1);
});
test('manual retry after failed save retains generated answer and same idempotency key', async () => {
  const f = fixture({ firstSaveFails: true });
  await assert.rejects(f.responder.respond(uuid(4), uuid(2), uuid(1)), { message: 'save_result_unknown' });
  await f.responder.respond(uuid(4), uuid(2), uuid(1));
  assert.equal(f.calls.generations.length, 1); assert.equal(f.calls.writes.length, 2);
  assert.equal(f.calls.writes[0].p_client_message_id, f.calls.writes[1].p_client_message_id);
});
test('generation failure is not automatically retried and does not write a fake answer', async () => {
  const f = fixture({ generationError: true });
  await assert.rejects(f.responder.respond(uuid(4), uuid(2), uuid(1)), { message: 'generation_unavailable' });
  assert.equal(f.calls.generations.length, 1); assert.equal(f.calls.writes.length, 0);
});
test('missing stored visitor message cannot trigger generation', async () => {
  const f = fixture({ missing: true });
  await assert.rejects(f.responder.respond(uuid(4), uuid(2), uuid(1)), { message: 'message_not_found' });
  assert.equal(f.calls.generations.length, 0);
});

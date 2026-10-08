import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ChatResponder, readConfig, ReplyError } from './responder.ts';
import { PublicPricing, readPricingConfig } from './pricing.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const config = readConfig(process.env);
const pricing = new PublicPricing(readPricingConfig(process.env));
const responder = config ? new ChatResponder(config, () => pricing.get()) : null;
const origins = new Set((process.env.CHAT_ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173,https://apexmedia.kz').split(',').map(value => value.trim()));
const port = Number(process.env.CHAT_SERVER_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid CHAT_SERVER_PORT');

function reply(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage): Promise<{ sessionId: string; messageId: string }> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new ReplyError('invalid_request', 400);
  let size = 0; const parts: Buffer[] = [];
  for await (const part of req) {
    const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
    size += bytes.length;
    if (size > 2048) throw new ReplyError('invalid_request', 413);
    parts.push(bytes);
  }
  let data: Record<string, unknown>;
  try { data = JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new ReplyError('invalid_request', 400); }
  if (!data || typeof data.sessionId !== 'string' || typeof data.messageId !== 'string'
    || !uuid.test(data.sessionId) || !uuid.test(data.messageId)) throw new ReplyError('invalid_request', 400);
  return { sessionId: data.sessionId.toLowerCase(), messageId: data.messageId.toLowerCase() };
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/health' && req.method === 'GET') { reply(res, responder ? 200 : 503, { ready: Boolean(responder) }); return; }
    if (req.url !== '/api/chat/respond') throw new ReplyError('not_found', 404);
    if (req.method !== 'POST') throw new ReplyError('method_not_allowed', 405);
    if (req.headers.origin && !origins.has(req.headers.origin)) throw new ReplyError('forbidden', 403);
    if (!responder) throw new ReplyError('response_unavailable');
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization ?? '')?.[1];
    if (!token || token.length > 8192) throw new ReplyError('not_authenticated', 401);
    const { sessionId, messageId } = await body(req);
    const userId = await responder.authorize(token, sessionId);
    await responder.respond(userId, sessionId, messageId);
    // Text is delivered only through Supabase history/Realtime, never synthesized by UI.
    reply(res, 200, { ok: true });
  } catch (error) {
    const safe = error instanceof ReplyError ? error : new ReplyError('response_unavailable');
    if (!res.destroyed) reply(res, safe.status, { error: safe.code });
    // No raw SDK errors, Authorization headers, prompts, messages or IDs in logs.
    if (safe.status >= 500) console.error(`[chat-responder] ${safe.code}`);
  }
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(port, process.env.CHAT_SERVER_HOST ?? '127.0.0.1', () => {
  console.log(`[chat-responder] listening on port ${port}; configured=${Boolean(responder)}`);
  if (!responder) console.log('[chat-responder] Set CHAT_SUPABASE_SERVICE_ROLE_KEY, CHAT_SUPABASE_URL and OPENROUTER_API_KEY in server-only environment.');
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
});

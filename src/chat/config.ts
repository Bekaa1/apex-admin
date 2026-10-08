import { ChatError } from './errors';

export function chatConfig(urlValue: unknown, keyValue: unknown) {
  const url = typeof urlValue === 'string' ? urlValue.trim() : '';
  const key = typeof keyValue === 'string' ? keyValue.trim() : '';
  if (!url || !key) throw new ChatError('not_configured');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error();
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      // Legacy JWTs are allowed only with the public anon role. This is a
      // configuration guard, not signature verification or authorization.
      const parts = key.split('.');
      if (parts.length !== 3) throw new Error();
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      if (JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).role !== 'anon') throw new Error();
    }
  } catch { throw new ChatError('invalid_configuration'); }
  return { url, key };
}

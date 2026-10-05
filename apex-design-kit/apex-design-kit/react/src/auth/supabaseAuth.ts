/*
 * Supabase Auth calls for the auth screens, with error codes mapped to the screens' states.
 * supabase-js v2. Email templates («Confirm signup», «Reset password») must contain the 6-digit {{ .Token }}, not a link.
 * Error codes differ between GoTrue versions — verify them against the deployed (self-hosted) Supabase and keep the mapping here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LoginError } from './LoginScreen';
import type { CodeError } from './CodeScreens';

type Failure<E extends string> = { ok: false; error: E | 'ratelimit' | 'unknown'; cause?: unknown };

function codeOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') || undefined : undefined;
}
function statusOf(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : undefined;
}
function isRateLimit(error: unknown): boolean {
  const code = codeOf(error);
  return statusOf(error) === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit';
}

/** Login (screen 1). On 'unconfirmed' also call resendSignupCode() and route to the verify screen. */
export async function signIn(sb: SupabaseClient, email: string, password: string): Promise<{ ok: true } | Failure<LoginError>> {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true };
  if (isRateLimit(error)) return { ok: false, error: 'ratelimit', cause: error };
  const code = codeOf(error);
  if (code === 'email_not_confirmed') return { ok: false, error: 'unconfirmed', cause: error };
  if (code === 'invalid_credentials' || statusOf(error) === 400) return { ok: false, error: 'invalid', cause: error };
  return { ok: false, error: 'unknown', cause: error };
}

/**
 * Sign-up (screen 2). With email confirmation ON, Supabase does not error on an already registered email:
 * it returns a user with an empty `identities` array → `alreadyRegistered: true` (show signup.errors.emailTaken or continue — product decision).
 */
export async function signUp(sb: SupabaseClient, email: string, password: string): Promise<{ ok: true; alreadyRegistered: boolean } | Failure<'weak'>> {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    if (isRateLimit(error)) return { ok: false, error: 'ratelimit', cause: error };
    if (codeOf(error) === 'weak_password') return { ok: false, error: 'weak', cause: error };
    return { ok: false, error: 'unknown', cause: error };
  }
  const alreadyRegistered = Boolean(data.user && (data.user.identities?.length ?? 0) === 0);
  return { ok: true, alreadyRegistered };
}

/** Verify email (screen 3). Success returns a session → open the cabinet. */
export async function verifySignupCode(sb: SupabaseClient, email: string, token: string): Promise<{ ok: true } | Failure<CodeError>> {
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (!error) return { ok: true };
  if (isRateLimit(error)) return { ok: false, error: 'ratelimit', cause: error };
  return { ok: false, error: 'invalid', cause: error };
}

/** Resend the sign-up code (screen 3; UI cooldown 60 s). */
export async function resendSignupCode(sb: SupabaseClient, email: string): Promise<{ ok: true } | Failure<never>> {
  const { error } = await sb.auth.resend({ type: 'signup', email });
  if (!error) return { ok: true };
  return { ok: false, error: isRateLimit(error) ? 'ratelimit' : 'unknown', cause: error };
}

/** Reset step 1 (screen 4). Treat «user not found» as success — never reveal whether the account exists. */
export async function requestPasswordReset(sb: SupabaseClient, email: string): Promise<{ ok: true } | Failure<never>> {
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (!error) return { ok: true };
  if (isRateLimit(error)) return { ok: false, error: 'ratelimit', cause: error };
  return { ok: true };
}

/** Reset step 2 (screen 5). Success returns a session that allows updateUser. */
export async function verifyResetCode(sb: SupabaseClient, email: string, token: string): Promise<{ ok: true } | Failure<CodeError>> {
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'recovery' });
  if (!error) return { ok: true };
  if (isRateLimit(error)) return { ok: false, error: 'ratelimit', cause: error };
  return { ok: false, error: 'invalid', cause: error };
}

/** Reset step 3 (screen 6). */
export async function setNewPassword(sb: SupabaseClient, password: string): Promise<{ ok: true } | Failure<'weak'>> {
  const { error } = await sb.auth.updateUser({ password });
  if (!error) return { ok: true };
  if (codeOf(error) === 'weak_password') return { ok: false, error: 'weak', cause: error };
  return { ok: false, error: isRateLimit(error) ? 'ratelimit' : 'unknown', cause: error };
}

import type { ResetPasswordState, VerificationState } from './navigation';

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function readResetPasswordState(state: unknown, search: string): ResetPasswordState | null {
  const data = record(state);
  const params = new URLSearchParams(search);
  const contact = params.get('contact')?.trim()
    || params.get('email')?.trim()
    || (typeof data.contact === 'string' ? data.contact.trim() : '')
    || (typeof data.email === 'string' ? data.email.trim() : '');
  if (!contact) return null;

  const queryChannel = params.get('channel');
  const channel = data.channel === 'sms' || data.channel === 'email'
    ? data.channel
    : queryChannel === 'sms' || queryChannel === 'email'
      ? queryChannel
      : contact.includes('@') ? 'email' : 'sms';
  return { contact, channel };
}

export function readVerificationState(state: unknown, search: string): VerificationState | null {
  const contact = readResetPasswordState(state, search);
  if (!contact) return null;
  return { ...contact, purpose: record(state).purpose === 'signin' ? 'signin' : 'signup' };
}

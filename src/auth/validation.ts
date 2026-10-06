export type EmailProblem = 'required' | 'format';
export type SignupContactProblem = 'required' | 'format';
export type PasswordProblem = 'required' | 'short' | 'weak';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARACTERS_RE = /^\+?[\d\s()-]+$/;
const KAZAKHSTAN_MOBILE_PHONE_RE = /^77\d{9}$/;

export function validateEmail(value: string): EmailProblem | null {
  const v = value.trim();
  if (!v) return 'required';
  return EMAIL_RE.test(v) ? null : 'format';
}

/** Normalizes common Kazakhstan phone formats to the E.164 form Supabase expects. */
export function normalizeKazakhstanPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !PHONE_CHARACTERS_RE.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('7')) digits = `7${digits}`;
  else if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;

  return KAZAKHSTAN_MOBILE_PHONE_RE.test(digits) ? `+${digits}` : null;
}

/** Accepts email or a Kazakhstan mobile number in national, +7, or 8-prefixed format. */
export function validateSignupContact(value: string): SignupContactProblem | null {
  const v = value.trim();
  if (!v) return 'required';

  if (v.includes('@')) return EMAIL_RE.test(v) ? null : 'format';
  return normalizeKazakhstanPhone(v) ? null : 'format';
}

/** New passwords: at least 8 characters, letters and digits (mirror this in Supabase Auth password settings). */
export function validateNewPassword(value: string): PasswordProblem | null {
  if (!value) return 'required';
  if (value.length < 8) return 'short';
  if (!/\p{L}/u.test(value) || !/\d/.test(value)) return 'weak';
  return null;
}

/** i18n keys for the problems above. */
export const EMAIL_ERROR_KEY: Record<EmailProblem, string> = {
  required: 'login.errors.required',
  format: 'login.errors.emailFormat',
};

export const CONTACT_ERROR_KEY: Record<SignupContactProblem, string> = {
  required: 'login.errors.required',
  format: 'signup.errors.contactFormat',
};

export const PASSWORD_ERROR_KEY: Record<PasswordProblem, string> = {
  required: 'login.errors.required',
  short: 'signup.errors.passwordShort',
  weak: 'signup.errors.passwordWeak',
};

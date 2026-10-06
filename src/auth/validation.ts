export type EmailProblem = 'required' | 'format';
export type SignupContactProblem = 'required' | 'format';
export type PasswordProblem = 'required' | 'short' | 'weak';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARACTERS_RE = /^\+?[\d\s()-]+$/;
const KAZAKHSTAN_NATIONAL_PHONE_RE = /^[067]\d{9}$/;
const KAZAKHSTAN_INTERNATIONAL_PHONE_RE = /^7[067]\d{9}$/;
const KAZAKHSTAN_TRUNK_PHONE_RE = /^8[067]\d{9}$/;

export function validateEmail(value: string): EmailProblem | null {
  const v = value.trim();
  if (!v) return 'required';
  return EMAIL_RE.test(v) ? null : 'format';
}

/** Accepts email or a Kazakhstan number in national, +7, or 8-prefixed format. */
export function validateSignupContact(value: string): SignupContactProblem | null {
  const v = value.trim();
  if (!v) return 'required';

  if (v.includes('@')) return EMAIL_RE.test(v) ? null : 'format';
  if (!PHONE_CHARACTERS_RE.test(v)) return 'format';

  const digits = v.replace(/\D/g, '');
  if (v.startsWith('+')) return KAZAKHSTAN_INTERNATIONAL_PHONE_RE.test(digits) ? null : 'format';
  if (KAZAKHSTAN_NATIONAL_PHONE_RE.test(digits)) return null;
  if (KAZAKHSTAN_INTERNATIONAL_PHONE_RE.test(digits) || KAZAKHSTAN_TRUNK_PHONE_RE.test(digits)) return null;
  return 'format';
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

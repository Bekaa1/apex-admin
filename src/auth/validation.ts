export type EmailProblem = 'required' | 'format';
export type PasswordProblem = 'required' | 'short' | 'weak';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): EmailProblem | null {
  const v = value.trim();
  if (!v) return 'required';
  return EMAIL_RE.test(v) ? null : 'format';
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

export const PASSWORD_ERROR_KEY: Record<PasswordProblem, string> = {
  required: 'login.errors.required',
  short: 'signup.errors.passwordShort',
  weak: 'signup.errors.passwordWeak',
};

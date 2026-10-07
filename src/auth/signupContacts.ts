import type { User } from '@supabase/supabase-js';
import { normalizeKazakhstanPhone } from './validation';

export const DUAL_CONTACT_SIGNUP = 'email_phone_v1';

// This marker selects the onboarding UI for new registrations; it is not an
// authorization claim. Contact ownership comes from Supabase Auth confirmation.
export function isDualContactSignup(user: User): boolean {
  return user.user_metadata.signup_flow === DUAL_CONTACT_SIGNUP;
}

export function hasConfirmedSignupContacts(user: User): boolean {
  return Boolean(user.email && user.email_confirmed_at && user.phone && user.phone_confirmed_at);
}

export function needsSignupContactVerification(user: User): boolean {
  return isDualContactSignup(user) && !hasConfirmedSignupContacts(user);
}

export function signupPhoneDraft(user: User): string {
  const draft: unknown = user.new_phone || user.user_metadata.signup_phone;
  return typeof draft === 'string' ? normalizeKazakhstanPhone(draft) ?? '' : '';
}

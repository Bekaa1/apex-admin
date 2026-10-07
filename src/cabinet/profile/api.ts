import { requireSupabase } from '../../lib/supabase';
import type { Tables } from '../../lib/database.types';

export type Profile = Pick<Tables<'users'>, 'full_name' | 'bin' | 'company_name'>;

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('users')
    .select('full_name, bin, company_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profile not found');
  return data;
}

export async function saveProfile(input: { fullName: string; bin: string; companyName: string }): Promise<void> {
  const { error } = await requireSupabase().rpc('complete_signup_profile', {
    p_full_name: input.fullName,
    p_bin: input.bin,
    p_company_name: input.companyName,
  });

  if (error) throw error;
}

export type ContactChannel = 'email' | 'phone';

export async function requestContactChange(input: { channel: ContactChannel; value: string }): Promise<void> {
  const client = requireSupabase();
  const { error } = input.channel === 'email'
    ? await client.auth.updateUser({ email: input.value })
    : await client.auth.updateUser({ phone: input.value });

  if (error) throw error;
}

export async function resendContactCode(input: { channel: ContactChannel; value: string }): Promise<void> {
  // /resend looks up the account by its existing contact, not the pending one.
  // Reissue the change through the signed-in user's session instead.
  await requestContactChange(input);
}

export async function verifyContactChange(input: { channel: ContactChannel; value: string; token: string }): Promise<void> {
  const client = requireSupabase();
  const { error } = input.channel === 'email'
    ? await client.auth.verifyOtp({ email: input.value, token: input.token, type: 'email_change' })
    : await client.auth.verifyOtp({ phone: input.value, token: input.token, type: 'phone_change' });

  if (error) throw error;
}

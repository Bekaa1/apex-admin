import { requireSupabase } from '../lib/supabase';
import { TARIFFS, type TariffTerms } from './tariffs';

export interface AccountProfile {
  companyName: string | null;
  /** The address invoices go to: the backend prefers the profile email over the sign-in one. */
  email: string | null;
}

export async function getAccountProfile(userId: string): Promise<AccountProfile> {
  const { data, error } = await requireSupabase().from('users').select('company_name, email').eq('id', userId).maybeSingle();
  if (error) throw error;
  // Profiles created before onboarding hold empty strings, which must read as «no value».
  return { companyName: data?.company_name?.trim() || null, email: data?.email?.trim() || null };
}

/** Terms of the plans on sale; archived ones and the corporate plan (sold by a manager) are left out. */
export async function fetchTariffTerms(signal: AbortSignal): Promise<TariffTerms[]> {
  const { data, error } = await requireSupabase().from('tariffs').select('code, min_amount, version, purchasable, is_archived').abortSignal(signal);
  if (error) throw error;
  return data.flatMap((row) => {
    const code = TARIFFS.find((plan) => plan.code === row.code)?.code;
    return code && row.purchasable && !row.is_archived ? [{ code, minimum: row.min_amount, version: row.version }] : [];
  });
}

import { requireSupabase } from '../lib/supabase';

export async function getAccountCompanyName(userId: string): Promise<string | null> {
  const { data, error } = await requireSupabase()
    .from('users')
    .select('company_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  // Profiles created before onboarding hold an empty string, which must read as «no company».
  return data?.company_name?.trim() || null;
}

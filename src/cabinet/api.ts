import { requireSupabase } from '../lib/supabase';

export async function getAccountCompanyName(userId: string): Promise<string | null> {
  const { data, error } = await requireSupabase()
    .from('users')
    .select('company_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return typeof data?.company_name === 'string' ? data.company_name : null;
}

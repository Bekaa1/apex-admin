import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../auth/useAuthSession';
import { getAccountCompanyName } from './api';
import { parseDemoVariant } from './demo';
import { queryKeys } from './queryKeys';

export interface Account {
  companyName: string | null;
  contact: string | null;
  status: 'loading' | 'ready' | 'error';
}

export function useAccount(): Account {
  const { session } = useAuthSession();
  const [params] = useSearchParams();
  const demo = parseDemoVariant(params.get('demo'));
  const userId = session?.user.id;
  const profile = useQuery({
    queryKey: queryKeys.account(userId),
    queryFn: () => {
      if (!userId) throw new Error('Authentication required');
      return getAccountCompanyName(userId);
    },
    enabled: Boolean(userId) && !demo,
  });
  if (import.meta.env.DEV && demo) {
    return demo === 'new'
      ? { companyName: null, contact: 'name@company.kz', status: 'ready' }
      : { companyName: 'ТОО «Ваша компания»', contact: 'marketing@company.kz', status: 'ready' };
  }
  return {
    companyName: profile.data ?? null,
    contact: session?.user.email || session?.user.phone || null,
    status: profile.isError ? 'error' : userId && profile.isPending ? 'loading' : 'ready',
  };
}

const LEGAL_FORMS = new Set(['ТОО', 'ИП', 'АО', 'ЖШС', 'ЖК', 'АҚ', 'LLP', 'LLC', 'JSC']);

/** «ТОО «Ваша компания»» → «ВК»; falls back to the first letter of the email. */
export function accountInitials({ companyName, contact }: Account): string {
  const words = (companyName ?? '')
    .replace(/[«»"“”']/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !LEGAL_FORMS.has(w.toUpperCase()));
  if (words.length) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return contact ? contact[0].toUpperCase() : '';
}

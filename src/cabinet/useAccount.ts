import { useSearchParams } from 'react-router';
import { parseDemoVariant } from './demo';

export interface Account {
  companyName: string | null;
  email: string | null;
}

const EMPTY: Account = { companyName: null, email: null };

/**
 * The signed-in advertiser for the side menu.
 * Real data comes with the auth session (owned by the auth flow); until then only the dev demo fills it.
 */
export function useAccount(): Account {
  const [params] = useSearchParams();
  const demo = parseDemoVariant(params.get('demo'));
  if (!demo) return EMPTY;
  return demo === 'new' ? { companyName: null, email: 'name@company.kz' } : { companyName: 'ТОО «Ваша компания»', email: 'marketing@company.kz' };
}

const LEGAL_FORMS = new Set(['ТОО', 'ИП', 'АО', 'ЖШС', 'ЖК', 'АҚ', 'LLP', 'LLC', 'JSC']);

/** «ТОО «Ваша компания»» → «ВК»; falls back to the first letter of the email. */
export function accountInitials({ companyName, email }: Account): string {
  const words = (companyName ?? '')
    .replace(/[«»"“”']/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !LEGAL_FORMS.has(w.toUpperCase()));
  if (words.length) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return email ? email[0].toUpperCase() : '';
}

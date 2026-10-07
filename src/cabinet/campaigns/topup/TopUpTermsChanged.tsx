import { useI18n } from '../../../i18n/i18n';
import { formatDayMonth, formatMoney, formatPrice } from '../../../lib/format';
import { TermsChanged, type TermsDiff } from '../TermsChanged';
import type { TopUpTerms } from './model';

/** «Условия тарифа изменились» on the top-up: the price of a play and the minimum against the last invoice. */
export function TopUpTermsChanged({ terms, tariffName, agreed, onAgree }: { terms: TopUpTerms; tariffName: string; agreed: boolean; onAgree: (value: boolean) => void }) {
  const { t, lang } = useI18n();
  const diffs: TermsDiff[] = [];
  if (terms.previousPrice !== null) {
    diffs.push({ key: 'price', label: t('campaigns.terms.price'), was: formatPrice(terms.previousPrice, lang), now: formatPrice(terms.pricePerPlay, lang) });
  }
  diffs.push({
    key: 'minimum',
    label: t('campaigns.terms.minimumTopUp'),
    was: terms.previousMinimum !== null && terms.previousMinimum !== terms.minimum ? formatMoney(terms.previousMinimum, lang) : null,
    now: formatMoney(terms.minimum, lang),
  });
  const text = terms.changedAt
    ? t('campaigns.terms.textSince', { date: formatDayMonth(terms.changedAt, lang), tariff: tariffName })
    : t('campaigns.terms.text', { tariff: tariffName });
  return <TermsChanged text={text} diffs={diffs} note={t('campaigns.terms.noteTopUp')} agreed={agreed} onAgree={onAgree} />;
}

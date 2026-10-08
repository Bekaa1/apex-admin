import type { Lang } from '../../i18n/i18n';
import { formatNumber, formatPrice, pluralKey } from '../../lib/format';
import { playsFor } from '../tariffs';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** «≈ 100 000 показов по 10 ₸»: what an amount buys at a plan's price of a play. */
export function aboutPlays(t: Translate, lang: Lang, amount: number, pricePerPlay: number): string {
  const count = playsFor(amount, pricePerPlay);
  return t('campaigns.plays.about', { plays: t(pluralKey('campaigns.plays.count', count, lang), { count: formatNumber(count, lang) }), price: formatPrice(pricePerPlay, lang) });
}

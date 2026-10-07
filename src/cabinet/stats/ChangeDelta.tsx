import { Delta } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatDelta } from '../../lib/format';
import { deltaTone, deltaTrend } from '../charts';
import type { Change } from './types';

/** «+33 %», «−3 %» or «новая» vs the previous period; nothing when the period has nothing to compare with. */
export function ChangeDelta({ change }: { change: Change }) {
  const { t, lang } = useI18n();
  if (change === null) return null;
  if (change === 'new') {
    return (
      <Delta tone="neutral" fresh>
        {t('stats.change.new')}
      </Delta>
    );
  }
  return (
    <Delta tone={deltaTone(change)} trend={deltaTrend(change)}>
      {formatDelta(change, lang)}
    </Delta>
  );
}

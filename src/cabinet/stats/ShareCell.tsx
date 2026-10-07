import { Meter } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatPercent } from '../../lib/format';

/** «Доля показов»: a bar and the percent. */
export function ShareCell({ share }: { share: number }) {
  const { t, lang } = useI18n();
  const pct = formatPercent(share, lang);
  return (
    <td className="st-table__share" data-label={t('stats.campaigns.columns.share')}>
      <span className="st-share">
        <Meter value={share * 100} size="sm" label={t('stats.campaigns.shareLabel', { pct })} />
        <span>{pct}</span>
      </span>
    </td>
  );
}

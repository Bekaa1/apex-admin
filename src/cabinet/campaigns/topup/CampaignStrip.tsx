import { Badge, Icon, Meter } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatNumber, pluralKey } from '../../../lib/format';
import { STAGE_BADGE } from '../list/rowView';
import type { TopUpCampaign } from './model';

/** The campaign being topped up: cover, name, status and what is left of the budget. */
export function CampaignStrip({ campaign }: { campaign: TopUpCampaign }) {
  const { t, lang } = useI18n();
  const badge = STAGE_BADGE[campaign.stage.kind];
  const { money } = campaign;
  const meta = [campaign.tariff ? t(`cabinet.tariffs.${campaign.tariff}.name`) : null, campaign.storesCount === null ? null : t(pluralKey('campaigns.row.stores', campaign.storesCount, lang), { count: formatNumber(campaign.storesCount, lang) })];
  const tone = money.ended ? 'danger' : money.low ? 'warning' : undefined;
  return (
    <div className="cmpt-camp">
      <span className={`cmp-cover cmp-cover--md cab-thumb--${campaign.coverTone}`} aria-hidden="true">
        {campaign.coverUrl ? <img src={campaign.coverUrl} alt="" /> : <Icon name="play" size={16} />}
      </span>
      <div className="cmpt-camp__main">
        <div className="cmpt-camp__title">
          <strong>{campaign.name}</strong>
          <Badge tone={badge.tone} dot>
            {t(badge.labelKey)}
          </Badge>
        </div>
        <span className="cmpt-camp__meta">{meta.filter(Boolean).join(' · ')}</span>
      </div>
      <div className="cmpt-camp__budget cab-cell-budget">
        <Meter value={money.ended ? 100 : money.spentPct} tone={tone ?? 'primary'} size="sm" label={t('campaigns.row.spentPct', { pct: Math.round(money.ended ? 100 : money.spentPct) })} />
        <span className={tone ? `is-${tone}` : undefined}>
          {money.ended ? t('campaigns.topUp.ended') : t('campaigns.row.left', { left: formatMoney(money.left, lang), total: formatMoney(money.budget, lang) })}
        </span>
      </div>
    </div>
  );
}

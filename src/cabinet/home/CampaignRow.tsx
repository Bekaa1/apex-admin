import { Link } from 'react-router';
import { Badge, Icon, Meter } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatCompactNumber, formatMoney } from '../../lib/format';
import { STATUS_TONE, statusLabelKey } from '../campaignStatus';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';
import { CoverMedia } from '../ui/CampaignCover';
import type { CampaignItem } from './types';

function RowAction({ campaign }: { campaign: CampaignItem }) {
  const { t } = useI18n();
  if (campaign.action === 'fix') {
    return (
      <ButtonLink to={CABINET_LINKS.campaignEdit(campaign.id)} variant="secondary" size="md" iconLeft="pencil">
        {t('home.campaigns.fix')}
      </ButtonLink>
    );
  }
  if (campaign.action === 'topUp') {
    return (
      <ButtonLink to={CABINET_LINKS.campaignTopUp(campaign.id)} variant="secondary" size="md">
        {t('home.campaigns.topUp')}
      </ButtonLink>
    );
  }
  const stats = campaign.action === 'stats';
  return (
    <ButtonLink to={stats ? CABINET_LINKS.campaignStats(campaign.id) : CABINET_LINKS.campaign(campaign.id)} variant="ghost" size="md" iconRight="arrow-right">
      {t(stats ? 'home.campaigns.stats' : 'home.campaigns.open')}
    </ButtonLink>
  );
}

/** One campaign of the Home table; below 800px of content width the row becomes a card (cabinet.css). */
export function CampaignRow({ campaign, index }: { campaign: CampaignItem; index: number }) {
  const { t, lang } = useI18n();
  const warn = campaign.lowBudget || campaign.budgetEnded;
  const spent = Math.round(campaign.spentPct);
  const notStarted = t('home.campaigns.notStarted');
  return (
    <tr>
      <td className="cab-table__main">
        <div className="cab-cell-campaign">
          <span className={`cab-thumb cab-thumb--${(index % 3) + 1}`} aria-hidden="true">
            <CoverMedia url={campaign.coverUrl} videoUrl={campaign.videoUrl} />
            {campaign.coverUrl ? null : <Icon name="play" size={14} />}
          </span>
          <span className="cab-table__name">
            <Link to={CABINET_LINKS.campaign(campaign.id)}>{campaign.name}</Link>
            {campaign.tariff ? <span>{campaign.tariff}</span> : null}
          </span>
        </div>
      </td>
      <td data-label={t('home.campaigns.status')}>
        <Badge tone={STATUS_TONE[campaign.status]} dot>
          {t(statusLabelKey(campaign.status))}
        </Badge>
      </td>
      <td data-label={t('home.campaigns.budget')} className="cab-table__budget">
        <div className="cab-cell-budget">
          <Meter
            value={campaign.spentPct}
            tone={campaign.budgetEnded ? 'danger' : campaign.lowBudget ? 'warning' : 'primary'}
            size="sm"
            label={t('home.campaigns.spent', { pct: spent })}
          />
          <span className={warn ? 'is-warning' : undefined}>
            {t('home.campaigns.left', { left: formatMoney(campaign.left, lang), total: formatMoney(campaign.budget, lang) })}
          </span>
        </div>
      </td>
      <td data-label={t('home.campaigns.plays')} className="cab-table__num">
        {campaign.plays7d === null ? (
          <span className="cab-subtle" title={notStarted}>
            —<span className="cab-sr"> {notStarted}</span>
          </span>
        ) : (
          formatCompactNumber(campaign.plays7d, lang)
        )}
      </td>
      <td className="cab-table__action">
        <RowAction campaign={campaign} />
      </td>
    </tr>
  );
}

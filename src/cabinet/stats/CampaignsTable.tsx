import { useId } from 'react';
import { Link } from 'react-router';
import { Badge, Icon, Sparkline } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney, formatNumber, formatPrice } from '../../lib/format';
import { STAGE_BADGE } from '../campaignStage';
import { CampaignCover } from '../ui/CampaignCover';
import { IconLink } from '../ui/IconLink';
import { ChangeDelta } from './ChangeDelta';
import { ShareCell } from './ShareCell';
import type { CampaignLine } from './types';

/** «По кампаниям»: each campaign's plays, share, spend and price for the period; a row opens the campaign's statistics. */
export function CampaignsTable({ lines, hrefOf }: { lines: CampaignLine[]; hrefOf: (id: string) => string }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const column = (key: string) => t(`stats.campaigns.columns.${key}`);
  return (
    <section className="cab-card st-card" aria-labelledby={titleId}>
      <div className="st-card__head">
        <div className="st-card__copy">
          <h2 className="cab-h3" id={titleId}>
            {t('stats.campaigns.title')}
          </h2>
          <p className="cab-small">{t('stats.campaigns.lead')}</p>
        </div>
      </div>
      <div className="cab-table-wrap">
        <table className="cab-table st-table">
          <thead>
            <tr>
              <th scope="col">{column('campaign')}</th>
              <th scope="col" className="cab-table__num">
                {column('plays')}
              </th>
              <th scope="col" className="st-table__share">
                {column('share')}
              </th>
              <th scope="col" className="cab-table__num">
                {column('spent')}
              </th>
              <th scope="col" className="cab-table__num">
                {column('price')}
              </th>
              <th scope="col" className="st-table__spark">
                {column('trend')}
              </th>
              <th scope="col">
                <span className="cab-sr">{column('more')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const badge = STAGE_BADGE[line.stage.kind];
              return (
                <tr key={line.id}>
                  <td className="cab-table__main">
                    <div className="cab-cell-campaign">
                      <CampaignCover url={line.coverUrl} videoUrl={line.videoUrl} tone={line.coverTone} size="sm" />
                      <div className="st-camp">
                        <span className="cab-table__name">
                          <Link to={hrefOf(line.id)}>{line.name}</Link>
                          {line.tariff ? <span>{t(`cabinet.tariffs.${line.tariff}.name`)}</span> : null}
                        </span>
                        <Badge tone={badge.tone} dot>
                          {t(badge.labelKey)}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="cab-table__num" data-label={column('plays')}>
                    <span className="st-num">
                      <strong>{formatNumber(line.plays, lang)}</strong>
                      <ChangeDelta change={line.change} />
                    </span>
                  </td>
                  <ShareCell share={line.share} />
                  <td className="cab-table__num" data-label={column('spent')}>
                    {formatMoney(line.spent, lang)}
                  </td>
                  <td className="cab-table__num" data-label={column('price')}>
                    {line.price === null ? '—' : formatPrice(line.price, lang)}
                  </td>
                  <td className="st-table__spark">
                    <Sparkline values={line.trend} />
                  </td>
                  <td className="cab-table__action st-table__go">
                    <IconLink to={hrefOf(line.id)} icon="chevron-right" label={t('stats.campaigns.more', { name: line.name })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="cab-note">
        <Icon name="info" size={18} />
        {t('stats.campaigns.note')}
      </p>
    </section>
  );
}

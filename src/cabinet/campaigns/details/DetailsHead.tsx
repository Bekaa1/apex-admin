import { useId } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Icon, Menu } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatDayMonth, formatNumber, pluralKey } from '../../../lib/format';
import { STAGE_BADGE } from '../../campaignStage';
import { ButtonLink } from '../../ui/ButtonLink';
import { campaignAction, moreActionKinds, type CampaignActionKind } from '../list/rowView';
import { formatClock } from '../wizard/media';
import type { CampaignDetails } from './types';

/** Buttons next to the title; the first one is the main action of the stage (as drawn in the design). */
function headActionKinds({ stage, canEdit, canTopUp }: CampaignDetails): CampaignActionKind[] {
  switch (stage.kind) {
    case 'rejected':
      return canEdit ? ['fix'] : [];
    case 'active':
    case 'noBudget': {
      const kinds: CampaignActionKind[] = [];
      if (canTopUp) kinds.push('topUp');
      if (canEdit) kinds.push('edit');
      return kinds;
    }
    case 'finished':
      return ['repeat'];
    default:
      return canEdit ? ['edit'] : [];
  }
}

const PRIMARY: CampaignActionKind[] = ['fix', 'topUp', 'repeat'];

export function DetailsHead({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const titleId = useId();
  const { stage } = details;
  const badge = STAGE_BADGE[stage.kind];
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const buttons = headActionKinds(details);
  const more = moreActionKinds(details, buttons).map((kind) => campaignAction(kind, details.id));

  let when: string | null = null;
  if (stage.kind === 'finished' && stage.from && stage.to) {
    when = t('campaigns.row.note.period', { from: formatDayMonth(stage.from, lang), to: formatDayMonth(stage.to, lang) });
  } else if (details.startDate) {
    when = t('campaigns.details.head.since', { date: formatDayMonth(details.startDate, lang) });
  } else if (details.createdAt) {
    when = t('campaigns.details.head.created', { date: formatDayMonth(details.createdAt, lang) });
  }
  const meta = [
    details.tariff ? t(`cabinet.tariffs.${details.tariff}.name`) : null,
    details.storesCount === null ? null : count('campaigns.row.stores', details.storesCount),
    details.cartsCount === null ? null : count('campaigns.row.carts', details.cartsCount),
    when,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="cab-card cmpd-head" aria-labelledby={titleId}>
      <span className={`cmp-cover cmp-cover--lg cab-thumb--${details.coverTone}`} aria-hidden="true">
        {details.coverUrl ? <img src={details.coverUrl} alt="" /> : <Icon name="play" size={22} />}
        {details.media.durationSec ? <span className="cmp-cover__time">{formatClock(details.media.durationSec)}</span> : null}
      </span>
      <div className="cmpd-head__main">
        <div className="cmpd-head__title">
          <h2 className="cab-h2" id={titleId}>
            {details.name}
          </h2>
          <Badge tone={badge.tone} dot>
            {t(badge.labelKey)}
          </Badge>
        </div>
        {meta.length ? (
          <p className="cmp-row__meta cmpd-head__meta">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </p>
        ) : null}
      </div>
      {buttons.length || more.length ? (
        <div className="cmpd-head__actions">
          {buttons.map((kind, index) => {
            const action = campaignAction(kind, details.id);
            return (
              <ButtonLink key={kind} to={action.to} variant={index === 0 && PRIMARY.includes(kind) ? 'primary' : 'secondary'} size="md" iconLeft={action.icon}>
                {t(kind === 'repeat' ? 'campaigns.row.menu.repeat' : action.labelKey)}
              </ButtonLink>
            );
          })}
          {more.length ? (
            <Menu
              label={t('campaigns.row.more', { name: details.name })}
              items={more.map((item) => ({ key: item.kind, label: t(`campaigns.row.menu.${item.kind}`), icon: item.icon, onSelect: () => navigate(item.to) }))}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

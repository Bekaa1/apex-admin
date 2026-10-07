import { Link } from 'react-router';
import { Badge } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import { CampaignCover } from '../CampaignCover';
import type { CampaignCard, PlaysPeriod } from '../types';
import { ActionCell, BudgetCell, PlaysCell } from './CampaignRowCells';
import { CampaignRowFoot } from './CampaignRowFoot';
import { STAGE_BADGE, stageNote } from './rowView';

/** One campaign: a 6-column card on wide content, a stacked card below 640px (campaigns.css). */
export function CampaignRow({ card, period }: { card: CampaignCard; period: PlaysPeriod }) {
  const { t, lang } = useI18n();
  const badge = STAGE_BADGE[card.stage.kind];
  const note = stageNote(card.stage, t, lang);
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const meta = [
    card.tariff ? t(`cabinet.tariffs.${card.tariff}.name`) : null,
    card.storesCount === null ? null : count('campaigns.row.stores', card.storesCount),
    card.cartsCount === null ? null : count('campaigns.row.carts', card.cartsCount),
  ].filter((item): item is string => Boolean(item));

  return (
    <li className="cab-card cmp-row">
      <div className="cmp-row__grid">
        <CampaignCover url={card.coverUrl} tone={card.coverTone} />
        <div className="cmp-row__main">
          <Link className="cmp-row__name" to={CABINET_LINKS.campaign(card.id)}>
            {card.name}
          </Link>
          {meta.length ? (
            <p className="cmp-row__meta">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="cmp-row__status">
          <Badge tone={badge.tone} dot>
            {t(badge.labelKey)}
          </Badge>
          {note ? <span className="cmp-row__note">{note}</span> : null}
        </div>
        <BudgetCell card={card} />
        <PlaysCell plays={card.plays} period={period} />
        <ActionCell card={card} />
      </div>
      <CampaignRowFoot stage={card.stage} />
    </li>
  );
}

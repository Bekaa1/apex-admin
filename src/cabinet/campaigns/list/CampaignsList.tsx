import { useId, useState } from 'react';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../lib/format';
import { countByTab, totalPlaysFor, visibleCards } from '../listFilters';
import type { CampaignCard } from '../types';
import { useListFilters } from '../useListFilters';
import { CampaignRow } from './CampaignRow';
import { CampaignsNotFound } from './CampaignsNotFound';
import { CampaignsToolbar } from './CampaignsToolbar';
import { CorporateBanner } from './CorporateBanner';

export function CampaignsList({ cards }: { cards: CampaignCard[] }) {
  const { t, lang } = useI18n();
  const panelId = useId();
  const { filters, update } = useListFilters();
  // Typing goes to local state first: the router applies URL changes a render later, which would move the caret.
  const [query, setQuery] = useState(filters.query);

  const visible = visibleCards(cards, { ...filters, query }, lang);
  const plays = totalPlaysFor(visible, filters.period);

  const changeQuery = (value: string) => {
    setQuery(value);
    update({ query: value });
  };
  const showAll = () => {
    setQuery('');
    update({ query: '', tab: 'all' });
  };

  return (
    <div className="cab-stack cab-stack--tight">
      <CampaignsToolbar filters={filters} query={query} counts={countByTab(cards)} panelId={panelId} onQueryChange={changeQuery} onChange={update} />
      <section id={panelId} role="tabpanel" aria-label={t(`campaigns.list.tabs.${filters.tab}`)} className="cmp-panel">
        {visible.length ? (
          <>
            <p className="cmp-panel__summary" aria-live="polite">
              <span>{t(pluralKey('campaigns.list.count', visible.length, lang), { count: formatNumber(visible.length, lang) })}</span>
              <span aria-hidden="true">·</span>
              <span>
                {t(pluralKey('campaigns.list.plays', plays, lang), {
                  count: formatNumber(plays, lang),
                  period: t(`campaigns.list.periodFor.${filters.period}`),
                })}
              </span>
            </p>
            <ul className="cmp-list">
              {visible.map((card) => (
                <CampaignRow key={card.id} card={card} period={filters.period} />
              ))}
            </ul>
          </>
        ) : (
          <CampaignsNotFound query={query.trim()} onShowAll={showAll} />
        )}
      </section>
      <CorporateBanner />
    </div>
  );
}

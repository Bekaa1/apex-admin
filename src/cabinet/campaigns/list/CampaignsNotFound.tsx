import { Button, Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';

/** Nothing matches the search or the tab. */
export function CampaignsNotFound({ query, onShowAll }: { query: string; onShowAll: () => void }) {
  const { t } = useI18n();
  return (
    <div className="cab-card cmp-empty cmp-empty--small">
      <span className="cab-tile cab-tile--brand cab-tile--md" aria-hidden="true">
        <Icon name="search" size={22} />
      </span>
      <h2 className="cab-h3">{query ? t('campaigns.notFound.titleQuery', { query }) : t('campaigns.notFound.title')}</h2>
      <p className="cab-muted">{t('campaigns.notFound.text')}</p>
      <Button variant="secondary" size="md" onClick={onShowAll}>
        {t('campaigns.notFound.reset')}
      </Button>
    </div>
  );
}

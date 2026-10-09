import './stats.css';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { LoadError } from '../ui/LoadError';
import { CampaignHeadCard } from './CampaignHeadCard';
import { NoPlays } from './NoPlays';
import { StatsEmpty } from './StatsEmpty';
import { StatsFilterBar } from './StatsFilterBar';
import { StatsReportView } from './StatsReportView';
import { StatsSkeleton } from './StatsSkeleton';
import { useStats } from './useStats';
import { useStatsFilters } from './useStatsFilters';
import { StatsExport } from './StatsExport';
import { useAuthSession } from '../../auth/useAuthSession';
import type { ReportFilters } from './reportSelection';

/** «Статистика»: all campaigns or one (`?campaign=`) for a period, as drawn in «Apex — Статистика». */
export function StatsPage() {
  const { t, lang } = useI18n();
  const { session } = useAuthSession();
  const [params] = useSearchParams();
  const { filters, update, linkTo } = useStatsFilters();
  const state = useStats(filters);
  const view = state.status === 'ready' ? state.view : null;
  const exportFilters: ReportFilters = { campaignId: view?.head?.id ?? null, period: view?.period ?? filters.period ?? '30d', scope: filters.scope, language: lang };
  const exportControl = <StatsExport key={`${session?.user.id}:${JSON.stringify(exportFilters)}`} filters={exportFilters}
    enabled={state.status === 'ready' && view?.body.kind === 'report'} demo={import.meta.env.DEV && params.has('demo')} />;
  if (view?.body.kind === 'empty') return <><StatsEmpty waiting={view.body.waiting} />{exportControl}</>;

  const head = view?.head ?? null;
  const body = view?.body ?? null;
  return (
    <div className="cab-stack cab-stack--tight st-page">
      {head ? (
        <Link className="cab-link cmp-back" to={linkTo({ campaignId: null, step: null })}>
          <Icon name="arrow-left" size={18} />
          {t('stats.filters.back')}
        </Link>
      ) : null}
      <StatsFilterBar
        filters={filters}
        options={view?.options ?? []}
        single={head !== null}
        period={view?.period ?? filters.period ?? '30d'}
        meta={body ? body.meta : null}
        onChange={update}
      />
      {exportControl}
      {state.status === 'loading' ? <StatsSkeleton /> : null}
      {state.status === 'error' ? (
        <LoadError title={t('stats.error.title')} onRetry={state.retry}>
          {t('stats.error.text')}
        </LoadError>
      ) : null}
      {head ? <CampaignHeadCard head={head} /> : null}
      {body?.kind === 'noPlays' ? <NoPlays meta={body.meta} scope={body.scope} single={head !== null} onAllTime={() => update({ period: 'all', step: null })} /> : null}
      {body?.kind === 'report' ? (
        <StatsReportView
          report={body}
          single={head !== null}
          onStep={(step) => update({ step })}
          campaignHref={(id) => linkTo({ campaignId: id, step: null })}
        />
      ) : null}
    </div>
  );
}

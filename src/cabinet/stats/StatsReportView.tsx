import type { ChartStep } from '../charts';
import { CampaignsTable } from './CampaignsTable';
import { CartsCard } from './CartsCard';
import { HoursCard } from './HoursCard';
import { PlaysCard } from './PlaysCard';
import { StatsKpis } from './StatsKpis';
import { StoresTable } from './StoresTable';
import type { StatsReport } from './types';
import { ZonesCard } from './ZonesCard';

interface StatsReportViewProps {
  report: StatsReport;
  single: boolean;
  onStep: (step: ChartStep) => void;
  campaignHref: (id: string) => string;
}

/** The numbers below the filters; blocks without data are left out. */
export function StatsReportView({ report, single, onStep, campaignHref }: StatsReportViewProps) {
  const { carts, zones, hours } = report;
  return (
    <>
      <StatsKpis kpis={report.kpis} meta={report.meta} single={single} />
      <PlaysCard chart={report.chart} single={single} onStep={onStep} />
      {report.campaigns?.length ? <CampaignsTable lines={report.campaigns} hrefOf={campaignHref} /> : null}
      {report.stores?.length ? <StoresTable lines={report.stores} /> : null}
      {carts || zones || hours ? (
        <div className="st-row">
          {carts ? <CartsCard carts={carts} single={single} /> : null}
          {zones ? <ZonesCard zones={zones} /> : null}
          {hours ? <HoursCard hours={hours} /> : null}
        </div>
      ) : null}
    </>
  );
}

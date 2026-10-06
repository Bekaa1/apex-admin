import { useEffect, useState } from 'react';
import { CampaignsTable } from './CampaignsTable';
import { GuideBudget } from './GuideBudget';
import { GuideSteps } from './GuideSteps';
import { GuideTariffs } from './GuideTariffs';
import { KpiTiles } from './KpiTiles';
import { LowBudgetAlert } from './LowBudgetAlert';
import { NextCampaignCard } from './NextCampaignCard';
import { SupportCard } from './SupportCard';
import type { HomeData } from './types';

function scrollToGuide() {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('how')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
}

/** Home for an advertiser with campaigns: alerts, 7-day summary, latest campaigns. */
export function HomeDashboard({ data }: { data: HomeData }) {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (guideOpen) scrollToGuide();
  }, [guideOpen]);

  return (
    <div className="cab-stack">
      <div className="cab-stack cab-stack--tight">
        {data.lowBudget ? <LowBudgetAlert campaign={data.lowBudget} /> : null}
        <KpiTiles data={data} />
        <CampaignsTable campaigns={data.campaigns} />
        <div className="cab-split">
          <NextCampaignCard onHowItWorks={() => (guideOpen ? scrollToGuide() : setGuideOpen(true))} />
          <SupportCard />
        </div>
      </div>
      {guideOpen ? (
        <>
          <GuideSteps />
          <GuideTariffs />
          <GuideBudget />
        </>
      ) : null}
    </div>
  );
}

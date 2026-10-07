import { GuideBudget } from './GuideBudget';
import { GuideHero } from './GuideHero';
import { GuideSteps } from './GuideSteps';
import { GuideTariffs } from './GuideTariffs';
import { HomeFaq } from './HomeFaq';
import { SectionLinks } from './SectionLinks';
import { SupportCard } from './SupportCard';
import type { TariffTerms } from '../tariffs';

/** Home for an advertiser without campaigns: how to launch the first one. */
export function HomeGuide({ tariffTerms }: { tariffTerms: TariffTerms[] | null }) {
  return (
    <div className="cab-stack">
      <GuideHero />
      <GuideSteps />
      <GuideTariffs terms={tariffTerms} />
      <GuideBudget />
      <SectionLinks />
      <div className="cab-split">
        <HomeFaq />
        <SupportCard firstLaunch />
      </div>
    </div>
  );
}

import { GuideBudget } from './GuideBudget';
import { GuideHero } from './GuideHero';
import { GuideSteps } from './GuideSteps';
import { GuideTariffs } from './GuideTariffs';
import { HomeFaq } from './HomeFaq';
import { SectionLinks } from './SectionLinks';
import { SupportCard } from './SupportCard';

/** Home for an advertiser without campaigns: how to launch the first one. */
export function HomeGuide() {
  return (
    <div className="cab-stack">
      <GuideHero />
      <GuideSteps />
      <GuideTariffs />
      <GuideBudget />
      <SectionLinks />
      <div className="cab-split">
        <HomeFaq />
        <SupportCard firstLaunch />
      </div>
    </div>
  );
}

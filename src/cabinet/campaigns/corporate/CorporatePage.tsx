import '../campaigns.css';
import { useId } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { CABINET_LINKS } from '../../sections';
import { CorporateFeatures } from './CorporateFeatures';
import { CorporateHero } from './CorporateHero';
import { CorporateRequest } from './CorporateRequest';

/** «Корпоративный тариф». From the wizard (?from=wizard) the back link returns to the plan step; the form there is kept in the tab. */
export function CorporatePage() {
  const { t } = useI18n();
  const titleId = useId();
  const [params] = useSearchParams();
  const fromWizard = params.get('from') === 'wizard';
  return (
    <div className="cab-stack cmp-corp">
      <Link className="cab-link cmp-back" to={fromWizard ? `${CABINET_LINKS.newCampaign}?step=2` : CABINET_LINKS.campaigns}>
        <Icon name="arrow-left" size={18} />
        {fromWizard ? t('campaigns.corporate.backToTariffs') : t('campaigns.wizard.back')}
      </Link>
      <CorporateHero titleId={titleId} />
      <CorporateFeatures />
      <CorporateRequest />
    </div>
  );
}

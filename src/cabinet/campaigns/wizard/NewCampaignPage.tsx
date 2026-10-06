import '../campaigns.css';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { WizardSource } from './useWizardData';
import { WizardScreen } from './WizardScreen';

/** «Новая кампания», or «Повторить» a campaign with ?copy=<id>. */
export function NewCampaignPage() {
  const [params] = useSearchParams();
  // The wizard drops ?copy= from the URL once the form is filled from it; the source must not change after that.
  const [source] = useState<WizardSource>(() => {
    const copy = params.get('copy');
    return copy ? { kind: 'copy', campaignId: copy } : { kind: 'new' };
  });
  return <WizardScreen source={source} />;
}

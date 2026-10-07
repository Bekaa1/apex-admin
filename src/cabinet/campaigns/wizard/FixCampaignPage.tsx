import '../campaigns.css';
import { Navigate, useParams } from 'react-router';
import { CABINET_LINKS } from '../../sections';
import { WizardScreen } from './WizardScreen';

/** «Исправление кампании»: the wizard over a campaign the moderator returned. */
export function FixCampaignPage() {
  const { campaignId } = useParams();
  if (!campaignId) return <Navigate to={CABINET_LINKS.campaigns} replace />;
  return <WizardScreen key={campaignId} source={{ kind: 'fix', campaignId }} />;
}

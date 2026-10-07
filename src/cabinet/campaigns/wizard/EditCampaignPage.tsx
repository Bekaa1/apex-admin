import '../campaigns.css';
import { Navigate, useParams } from 'react-router';
import { CABINET_LINKS } from '../../sections';
import { WizardScreen } from './WizardScreen';

/** «Редактирование кампании», also «Исправить» for a campaign the moderator returned. */
export function EditCampaignPage() {
  const { campaignId } = useParams();
  if (!campaignId) return <Navigate to={CABINET_LINKS.campaigns} replace />;
  return <WizardScreen key={campaignId} source={{ kind: 'edit', campaignId }} />;
}

import { useAuthSession } from '../auth/useAuthSession';
import { Button, type ButtonProps } from '../design-system';
import { campaignIntentHref, rememberCampaignIntent, type CampaignIntent } from '../lib/campaignIntent';

type Props = Omit<Extract<ButtonProps, { href: string }>, 'href' | 'onClick'> & CampaignIntent;

export function CampaignLink({ tariff, storeId, children, ...props }: Props) {
  const { session, status } = useAuthSession();
  const intent = { tariff, storeId };
  return <Button {...props} disabled={status === 'loading' || props.disabled} href={session ? campaignIntentHref(intent) : '/signup'} onClick={() => rememberCampaignIntent(intent)}>{children}</Button>;
}

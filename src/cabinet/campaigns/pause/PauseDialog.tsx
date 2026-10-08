import { Alert, Button, Dialog, Icon, type IconName } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney } from '../../../lib/format';
import type { CampaignPause } from './useCampaignPause';

/** «Поставить «…» на паузу?»: what happens to the shows, the budget and how to resume. */
export function PauseDialog({ name, left, pause }: { name: string; left: number; pause: CampaignPause }) {
  const { t, lang } = useI18n();
  const points: Array<[IconName, string]> = [
    ['pause', t('campaigns.pause.stops')],
    ['wallet', t('campaigns.pause.budget', { amount: formatMoney(left, lang) })],
    ['play', t('campaigns.pause.resume')],
  ];
  return (
    <Dialog
      open={pause.confirmOpen}
      icon="pause"
      tone="warning"
      title={t('campaigns.pause.title', { name })}
      closeLabel={t('campaigns.pause.close')}
      onClose={pause.closeConfirm}
      actions={
        <>
          <Button variant="secondary" size="md" data-autofocus onClick={pause.closeConfirm}>
            {t('campaigns.pause.cancel')}
          </Button>
          <Button size="md" iconLeft="pause" loading={pause.pending} onClick={pause.pause}>
            {t('campaigns.pause.confirm')}
          </Button>
        </>
      }
    >
      <ul className="cmp-hold-list">
        {points.map(([icon, text]) => (
          <li key={icon}>
            <Icon name={icon} size={18} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {pause.errorKey ? (
        <Alert tone="danger" className="cmp-hold-error">
          {t(pause.errorKey)}
        </Alert>
      ) : null}
    </Dialog>
  );
}

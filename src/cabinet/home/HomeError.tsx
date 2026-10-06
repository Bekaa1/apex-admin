import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

export function HomeError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="cab-stack cab-stack--tight">
      <Alert
        tone="danger"
        title={t('home.summary.errorTitle')}
        action={
          <Button variant="secondary" size="md" iconLeft="refresh" onClick={onRetry}>
            {t('home.summary.retry')}
          </Button>
        }
      >
        {t('home.summary.errorText')}
      </Alert>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

/** Page-level «couldn't load» message with a retry button. */
export function LoadError({ title, children, onRetry }: { title: string; children: ReactNode; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="cab-stack cab-stack--tight">
      <Alert
        tone="danger"
        title={title}
        action={
          <Button variant="secondary" size="md" iconLeft="refresh" onClick={onRetry}>
            {t('cabinet.retry')}
          </Button>
        }
      >
        {children}
      </Alert>
    </div>
  );
}

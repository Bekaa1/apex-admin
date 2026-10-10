import { Badge, cx, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';
import type { TariffCode, TariffLook } from '../tariffs';
import styles from './TariffParts.module.css';

// Pieces of a plan card shared by the landing «Тарифы», the wizard's plan step and the cabinet guide.

type CardCode = TariffCode | 'corporate';

/** The plan's icon tile; the recommended plan also gets «Рекомендуем» with a star. */
export function TariffTop({ look, recommended = false }: { look: TariffLook; recommended?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={styles.top}>
      <span className={styles.icon} aria-hidden="true">
        <Icon name={look.icon} size={24} />
      </span>
      {recommended ? (
        <Badge tone="brand" className={styles.recommended}>
          <Icon name="star" size={14} />
          {t('cabinet.tariffs.recommended')}
        </Badge>
      ) : null}
    </span>
  );
}

/** «800 000 ₸ / мес» and what the plan is for; «По договорённости» for «Эксклюзив». `minimum` is null while the terms load. */
export function TariffPrice({ code, minimum, className }: { code: CardCode; minimum: number | null; className?: string }) {
  const { t, lang } = useI18n();
  return (
    <div className={cx(styles.price, className)}>
      <p className={styles.amount}>
        {code === 'corporate' ? (
          <strong>{t('cabinet.tariffs.byAgreement')}</strong>
        ) : (
          <>
            <strong>{minimum === null ? '—' : formatMoney(minimum, lang)}</strong>
            <span>{t('cabinet.tariffs.perMonth')}</span>
          </>
        )}
      </p>
      <p className={styles.purpose}>{t(`cabinet.tariffs.${code}.text`)}</p>
    </div>
  );
}

/** What the plan gives, with check marks. */
export function TariffPoints({ code, look, className }: { code: CardCode; look: TariffLook; className?: string }) {
  const { t } = useI18n();
  return (
    <ul className={cx(styles.points, className)}>
      {look.points.map((point) => (
        <li key={point}>
          <Icon name="check-circle" size={18} />
          <span>{t(`cabinet.tariffs.${code}.points.${point}`)}</span>
        </li>
      ))}
    </ul>
  );
}

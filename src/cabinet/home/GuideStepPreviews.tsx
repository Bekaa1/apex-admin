import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';

// Illustrations of what each step of the campaign wizard asks for (decorative examples, not data).

export function VideoPreview() {
  const { t } = useI18n();
  return (
    <>
      <div className="cab-pv-file">
        <span className="cab-pv-file__thumb">
          <Icon name="video" size={18} />
        </span>
        <span className="cab-pv-file__name">promo.mp4</span>
        <span className="cab-pv-file__time">0:07</span>
      </div>
      <ul className="cab-pv-checks">
        <li>
          <Icon name="check" size={16} />
          {t('home.steps.video.cover')}
        </li>
        <li>
          <Icon name="check" size={16} />
          {t('home.steps.video.details')}
        </li>
      </ul>
    </>
  );
}

export function TariffPreview() {
  const { t } = useI18n();
  return (
    <ul className="cab-pv-pills">
      <li>{t('cabinet.tariffs.standard.name')}</li>
      <li className="is-on">
        <Icon name="check" size={14} />
        {t('cabinet.tariffs.zones.name')}
      </li>
      <li>{t('cabinet.tariffs.premium.name')}</li>
      <li>{t('cabinet.tariffs.corporate.name')}</li>
    </ul>
  );
}

const PINS = [
  { left: '16%', top: '18%' },
  { left: '38%', top: '58%' },
  { left: '56%', top: '30%' },
  { left: '74%', top: '66%' },
  { left: '86%', top: '22%' },
];

export function StoresPreview() {
  const { t } = useI18n();
  return (
    <>
      <div className="cab-pv-map">
        <svg className="cab-pv-map__streets" viewBox="0 0 200 72" preserveAspectRatio="none">
          <path d="M0 22h200M0 52h200M48 0v72M118 0v72M168 0v72M0 6l60 66M140 0l60 40" />
        </svg>
        {PINS.map((pin) => (
          <span key={pin.left} className="cab-pv-map__pin" style={pin}>
            <Icon name="map-pin" size={18} />
          </span>
        ))}
      </div>
      <p className="cab-pv-caption">
        <Icon name="store" size={16} />
        {t('home.steps.stores.selected', { count: 12 })}
      </p>
    </>
  );
}

export function ZonesPreview() {
  const { t } = useI18n();
  return (
    <ul className="cab-pv-pills">
      <li className="is-on is-accent">
        <Icon name="check" size={14} />
        {t('home.steps.zones.drinks')}
      </li>
      <li className="is-on is-accent">
        <Icon name="check" size={14} />
        {t('home.steps.zones.snacks')}
      </li>
      <li>{t('home.steps.zones.household')}</li>
    </ul>
  );
}

export function BudgetPreview() {
  const { t, lang } = useI18n();
  return (
    <dl className="cab-pv-rows">
      <div>
        <dt>{t('home.steps.budget.minimum')}</dt>
        <dd>{formatMoney(1_000_000, lang)}</dd>
      </div>
      <div>
        <dt>{t('home.steps.budget.yours')}</dt>
        <dd className="is-ok">
          <Icon name="check-circle" size={16} />
          {formatMoney(1_200_000, lang)}
        </dd>
      </div>
    </dl>
  );
}

import { useId, useState } from 'react';
import { Badge, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { unitPrice } from '../campaigns/details/model';
import { overviewDate } from '../overview/model';
import { BOOLEAN_FIELDS, type TariffRow } from './model';
import shared from '../corporate-requests/CorporateRequestsPage.module.css';
import styles from './TariffsPage.module.css';

function TariffEntry({ row }: { row: TariffRow }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const unknown = t('adminTariffs.notSpecified');
  return <>
    <tr>
      <td>{row.name.trim() || unknown}</td>
      <td>{row.code?.trim() || t('adminTariffs.noCode')}</td>
      <td>{unitPrice(row.price_per_play, lang, unknown)}</td><td>{unitPrice(row.min_amount, lang, unknown)}</td>
      <td>{String(row.version)}</td>
      <td><Badge className={shared.status} tone={row.purchasable ? 'success' : 'neutral'}>{t(row.purchasable ? 'adminTariffs.purchase.yes' : 'adminTariffs.purchase.no')}</Badge></td>
      <td><Badge className={shared.status} tone="neutral">{t(row.is_archived ? 'adminTariffs.archive.yes' : 'adminTariffs.archive.no')}</Badge></td>
      <td>{overviewDate(row.updated_at, lang, unknown)}</td>
      <td><Button size="md" variant="ghost" aria-expanded={expanded} aria-controls={detailsId}
        aria-label={t(expanded ? 'adminTariffs.hideFor' : 'adminTariffs.showFor', { name: row.name.trim() || unknown })}
        onClick={() => setExpanded(value => !value)}>{t(expanded ? 'adminTariffs.hide' : 'adminTariffs.details')}</Button></td>
    </tr>
    <tr hidden={!expanded} className={styles.detailRow}><td colSpan={9}>
      <div id={detailsId}>
        <dl className={styles.fields}>
          {BOOLEAN_FIELDS.map(field => <div key={field}><dt>{t(`adminTariffs.parameters.${field}`)}</dt><dd>{t(row[field] ? 'adminTariffs.yes' : 'adminTariffs.no')}</dd></div>)}
          <div><dt>{t('adminTariffs.parameters.badge')}</dt><dd>{row.badge?.trim() || unknown}</dd></div>
          <div><dt>{t('adminTariffs.parameters.sort_order')}</dt><dd>{String(row.sort_order)}</dd></div>
        </dl>
      </div>
    </td></tr>
  </>;
}

export function TariffTable({ rows }: { rows: TariffRow[] }) {
  const { t } = useI18n();
  return <div className={shared.tableWrap} role="region" aria-label={t('adminTariffs.title')} tabIndex={0}>
    <table className={`${shared.table} ${styles.table}`}>
      <caption className={shared.srOnly}>{t('adminTariffs.title')}</caption>
      <thead><tr>{['name', 'code', 'price', 'minimum', 'version', 'purchase', 'archive', 'updated', 'details'].map(key => <th key={key} scope="col">{t(`adminTariffs.columns.${key}`)}</th>)}</tr></thead>
      <tbody>{rows.map(row => <TariffEntry key={row.id} row={row} />)}</tbody>
    </table>
  </div>;
}

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { usePermissions } from '../../../auth/usePermissions';
import { adminStatusTone } from '../../statusTone';
import { formatNumber } from '../../../lib/format';
import { overviewDate } from '../../overview/model';
import { storeDetailPath } from '../model';
import type { BeaconItem, CartItem, StoreTab, ZoneRow } from './model';
import styles from '../../campaigns/details/CampaignDetail.module.css';
import local from './StoreDetail.module.css';

/** Same accessible table structure/styles as the existing administrative detail tables. */
function TableFrame({ tab, columns, children }: { tab: StoreTab; columns: string[]; children: ReactNode }) {
  const { t } = useI18n();
  const label = t(`adminStoreDetail.tabs.${tab}`);
  return <div className={styles.tableWrap} role="region" aria-label={label} tabIndex={0}>
    <table className={`${styles.table} ${local.recordsTable} ${local[tab]} ${columns.includes('store') ? local.withStores : ''}`}>
      <caption className={styles.srOnly}>{label}</caption>
      <thead><tr>{columns.map(key => <th key={key} scope="col">{t(key === 'store' ? 'adminEquipment.store' : key === 'route' ? 'roles.route' : `adminStoreDetail.columns.${key}`)}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>;
}

function ZoneValue({ id, name }: { id: string | null; name: string | null }) {
  const { t } = useI18n();
  if (!id) return <>{t('adminStores.notSpecified')}</>;
  return <>{name || id}{name ? <span className={styles.identifier}>{id}</span> : null}</>;
}

/** Preserve raw status codes, including unknown ones; do not infer connectivity from time. */
function DeviceStatus({ value }: { value: string | null }) {
  const { t } = useI18n();
  return <Badge tone={adminStatusTone('equipment', value)} className={styles.status}>{value?.trim() || t('adminStoreDetail.noData')}</Badge>;
}

export function ZoneTable({ rows }: { rows: ZoneRow[] }) {
  const { t } = useI18n();
  const unknown = t('adminStores.notSpecified');
  return <TableFrame tab="zones" columns={['name', 'description', 'id']}>
    {rows.map(row => <tr key={row.id}><td>{row.name.trim() || unknown}</td><td>{row.description?.trim() || unknown}</td><td>{row.id}</td></tr>)}
  </TableFrame>;
}

function StoreValue({ id, names }: { id: string | null; names: Readonly<Record<string, string>> }) {
  const { t } = useI18n();
  return id ? <Link className={local.storeLink} to={storeDetailPath(id)}>{names[id] || id}</Link> : <>{t('adminStores.notSpecified')}</>;
}

export function CartTable({ rows, stores }: { rows: CartItem[]; stores?: Readonly<Record<string, string>> }) {
  const { t, lang } = useI18n();
  const { can } = usePermissions();
  const noData = t('adminStoreDetail.noData');
  return <TableFrame tab="carts" columns={['cartNumber', ...(stores ? ['store'] : []), 'status', 'battery', 'lastSeen', 'lastPing', 'currentZone', ...(can('cartRoute') ? ['route'] : [])]}>
    {rows.map(row => <tr key={row.id}>
      <td>{row.cart_number?.trim() || (row.display_id === null ? noData : String(row.display_id))}</td>
      {stores ? <td><StoreValue id={row.store_id} names={stores} /></td> : null}
      <td><DeviceStatus value={row.status} /></td>
      <td>{row.battery_level === null ? noData : `${formatNumber(row.battery_level, lang)}%`}</td>
      <td>{overviewDate(row.last_seen_at, lang, noData)}</td><td>{overviewDate(row.last_ping_at, lang, noData)}</td>
      <td><ZoneValue id={row.current_zone_id} name={row.zoneName} /></td>
      {can('cartRoute') ? <td><Link to={`/admin/cart-routes/${row.id}`}>{t('roles.route')}</Link></td> : null}
    </tr>)}
  </TableFrame>;
}

export function BeaconTable({ rows, stores }: { rows: BeaconItem[]; stores?: Readonly<Record<string, string>> }) {
  const { t } = useI18n();
  const noData = t('adminStoreDetail.noData');
  return <TableFrame tab="beacons" columns={['boxNumber', 'deviceIdentifier', ...(stores ? ['store'] : []), 'status', 'zone']}>
    {rows.map(row => <tr key={row.id}>
      <td>{row.box_number?.trim() || noData}</td><td>{row.device_identifier?.trim() || noData}</td>
      {stores ? <td><StoreValue id={row.store_id} names={stores} /></td> : null}
      <td><DeviceStatus value={row.status} /></td><td><ZoneValue id={row.zone_id} name={row.zoneName} /></td>
    </tr>)}
  </TableFrame>;
}

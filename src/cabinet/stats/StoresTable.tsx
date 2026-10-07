import { useId, useState } from 'react';
import { Button, cx } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber, pluralKey } from '../../lib/format';
import { ChangeDelta } from './ChangeDelta';
import { ShareCell } from './ShareCell';
import type { StoreLine } from './types';

const FIRST_ROWS = 6;
/** As drawn: a store with fewer carts online than this share is marked. */
const ONLINE_WARNING = 0.9;

/** «По магазинам»: plays per store and per cart, and carts online now. */
export function StoresTable({ lines }: { lines: StoreLine[] }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const [all, setAll] = useState(false);
  const shown = all ? lines : lines.slice(0, FIRST_ROWS);
  const withCarts = lines.some((line) => line.carts);
  const column = (key: string) => t(`stats.stores.columns.${key}`);
  return (
    <section className="cab-card st-card" aria-labelledby={titleId}>
      <div className="st-card__head">
        <div className="st-card__copy">
          <h2 className="cab-h3" id={titleId}>
            {t('stats.stores.title')}
          </h2>
          <p className="cab-small">{t(pluralKey('stats.stores.lead', lines.length, lang), { count: formatNumber(lines.length, lang) })}</p>
        </div>
      </div>
      <div className="cab-table-wrap">
        <table className="cab-table st-table st-table--stores">
          <thead>
            <tr>
              <th scope="col">{column('store')}</th>
              <th scope="col" className="cab-table__num">
                {column('plays')}
              </th>
              <th scope="col" className="st-table__share">
                {column('share')}
              </th>
              <th scope="col" className="cab-table__num">
                {column('perCart')}
              </th>
              {withCarts ? (
                <th scope="col" className="cab-table__num">
                  {column('online')}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {shown.map((line) => (
              <tr key={line.id}>
                <td className="cab-table__main">
                  <span className="cab-table__name st-store">
                    <strong>{line.name}</strong>
                    {line.address ? <span>{line.address}</span> : null}
                  </span>
                </td>
                <td className="cab-table__num" data-label={column('plays')}>
                  <span className="st-num">
                    <strong>{formatNumber(line.plays, lang)}</strong>
                    <ChangeDelta change={line.change} />
                  </span>
                </td>
                <ShareCell share={line.share} />
                <td className="cab-table__num" data-label={column('perCart')}>
                  {line.perCart === null ? '—' : formatNumber(Math.round(line.perCart), lang)}
                </td>
                {withCarts ? (
                  <td className="cab-table__num" data-label={column('online')}>
                    {line.carts ? (
                      <span className={cx('st-online', line.carts.online < line.carts.total * ONLINE_WARNING && 'is-warning')}>
                        <span className="st-online__dot" aria-hidden="true" />
                        {t('stats.stores.onlineOf', { online: formatNumber(line.carts.online, lang), total: formatNumber(line.carts.total, lang) })}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!all && lines.length > FIRST_ROWS ? (
        <Button variant="ghost" size="md" className="st-more" onClick={() => setAll(true)}>
          {t('stats.stores.showAll', { count: formatNumber(lines.length, lang) })}
        </Button>
      ) : null}
    </section>
  );
}

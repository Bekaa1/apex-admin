import type { NotificationRow } from './api';

/** Notifications of /cabinet?demo=active, with the backend's texts. A function, so production builds drop it. */
export function demoNotifications(now = Date.now()): NotificationRow[] {
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  const row = (id: string, minutes: number, read: boolean, fields: Pick<NotificationRow, 'type' | 'severity' | 'title' | 'body' | 'action'> & { data?: NotificationRow['data'] }): NotificationRow => ({
    id,
    ad_id: fields.action ? 'demo-ad-1' : null,
    data: fields.data ?? {},
    read_at: read ? ago(minutes - 1) : null,
    created_at: ago(minutes),
    ...fields,
  });
  return [
    row('demo-ntf-1', 12, false, { type: 'campaign_budget_low', severity: 'warning', title: 'Бюджет почти закончился', body: '«Летний лимонад» (№12): осталось 9 000 ₸. Пополните, чтобы показы не остановились.', action: 'topup' }),
    row('demo-ntf-2', 95, false, { type: 'campaign_approved', severity: 'success', title: 'Кампания одобрена — требуется оплата', body: '«Осенняя распродажа» (№14) прошла модерацию. К оплате: 100 000 ₸.', action: 'pay_invoice' }),
    row('demo-ntf-3', 60 * 26, true, {
      type: 'campaign_rejected',
      severity: 'error',
      title: 'Кампания отклонена',
      body: '«Новинка недели» (№13). Комментарий модератора: замените ролик на версию с субтитрами.',
      action: 'open_campaign',
      data: { reasons: ['duration_7s', 'languages_kk_ru'] },
    }),
    row('demo-ntf-4', 60 * 50, true, { type: 'welcome', severity: 'info', title: 'Добро пожаловать в Apex Media!', body: 'Создайте первую кампанию: ролик, супермаркеты и бюджет.', action: 'create_campaign' }),
  ];
}

# Цвета статусов ApexAdmin

Проверка: 9 октября 2026 года. Ветка: `fix/admin-status-colors`.

## Область проверки

Просмотрены дерево административных маршрутов, все административные TS/TSX/CSS-файлы, Badge/Alert/StatTile и семантические токены дизайн-системы. Проверены обзор, списки и карточки кампаний, модерация, счета и подтверждение оплаты, клиенты и их вложенные таблицы, супермаркеты, оборудование, заявки и мастер, очередь владельца, тарифы, корпоративные заявки, команда, журнал, медиа, партнёрские страницы и история маршрутов тележки. Проверены ошибки фильтров, доступа и вспомогательных запросов.

В текущем административном route tree нет отдельных страниц статистики, аналитики или платежей, процентных сравнений KPI и графиков результатов. Обзор содержит абсолютные количества, а история маршрутов тележки — таблицу событий. Статистика/аналитика рекламодателя расположена в `/cabinet/*`. Общий `deltaTone` уже учитывает обратный смысл стоимости и нейтральный ноль; это закреплено тестом, код кабинета не изменён.

## Найденные несоответствия и исправления

| Место | Было | Стало |
| --- | --- | --- |
| Результат отклонения заявки владельцем | Зелёное уведомление `rejected` | Красное; `approved` остаётся зелёным |
| Мастер/итог заявки | Отклонение — жёлтое, одобрение на ранних шагах — синее, итоговый статус без бейджа | Общий цвет статуса, красный комментарий отклонения; ожидание — предупреждающее |
| Кампании | `completed` серый | Зелёный во всех административных представлениях |
| Счета | `unpaid` жёлтый, `cancelled` серый | Красные в списке и карточке |
| Счета внутри кампании | Все статусы серые | Те же правила, что в основном списке счетов |
| Оборудование и партнёрские таблицы | `active`, `online`, `offline` серые | Зелёные `active`/`online`, красный `offline` |
| Тарифы | Покупка недоступна — серый | Красный, независимо от архивности тарифа |
| Обзор | Значения и иконки всех счётчиков одинаковые | При ненулевом количестве цвет соответствует статусу; ноль/нет данных нейтральны; ошибка красная |
| Итоговые проверки заявки | Успех без цветового индикатора, ошибка преимущественно рамкой | Согласованные текст/фон/рамка: зелёные пройденные, красные непройденные проверки; символы ✓/! сохранены |
| Ошибки фильтров, UUID, отказ доступа, недоступные названия связанных записей | Часть сообщений синяя или жёлтая | Красные сообщения без изменения условий их показа |

Подтверждённое успешное сохранение/отправка операции остаётся зелёным; отдельный статус «На рассмотрении» — предупреждающим. Информационные пояснения, пустые результаты, неподтверждённый результат операции и незавершённый черновик не объявляются успешными или ошибочными автоматически.

## Единые правила

`src/admin/statusTone.ts` содержит `ADMIN_STATUS_TONES`, `adminStatusTone`, `adminStatusAlertTone` и `adminCounterTone`. Карта зависит от сущности: одинаковое слово не означает одинаковый бизнес-результат.

| Контекст | Positive / зелёный | Negative / красный | Neutral / серый, синий, предупреждающий |
| --- | --- | --- | --- |
| Кампания | `active`, `completed` | `rejected`, `budget_ended` | `pending`, `awaiting_payment`, `paused`, `hours_ended`, `draft`, `archived`, `deleted` |
| Счёт | `paid` | `unpaid`, `cancelled`, `overdue`, `failed` | `pending`, неизвестные значения |
| Оборудование | `active`, `online` | `offline`, `failed`, `error`, `blocked`, `unavailable` | `inactive`, `maintenance`, неизвестные значения |
| Заявка на супермаркет | `approved` | `rejected` | `inactive` (черновик), `pending_owner_approval` |
| Доступность покупки тарифа | `available` | `unavailable` | Архивность показана отдельно, нейтрально |

Дополнительные распознаваемые строковые значения используются только для оформления, не добавляются в фильтры, enum, правила валидации или переходов. Неизвестные/null-значения нейтральны, исходные подписи сохранены. `inactive` оборудования не приравнен к поломке: такого правила в контракте нет. Не вычисляется online по времени или зарядке. Цвета зон картограммы описывают категории, а не успешность, поэтому сохранены.

У корпоративных заявок нет подтверждённого справочника статусов: они по-прежнему выводятся исходным текстом нейтрально. Роль пользователя и `is_active` профиля не интерпретируются как результат операции или блокировка Auth.

`status_color` есть в типах данных, но административные запросы и компоненты его не используют. Он не передаётся в новую карту и не может переопределить цвет известного статуса.

## Темы и доступность

Использованы существующие `--success`, `--danger`, `--warning` и соответствующие `*-soft`; новая палитра не вводилась. Badge сохраняет текст, фон и точку в согласованном тоне. Заголовки Alert окрашены в соответствующий семантический цвет только внутри AdminShell. Кнопки, раскладка и типографика не переделаны.

В Chrome на локальном стенде с подменённым Supabase проверены обзор, таблицы кампаний/счетов, оборудование, тарифы и заявки; светлая и тёмная темы. Отдельно проверены итоговая карточка отклонённой заявки, цвета checklist и ошибка ввода номера счёта. Мобильная проверка выполнена при viewport 390×844 (доступная ширина документа 375 px со скроллбаром): карточка, список заявок и фильтр счетов, без горизонтального переполнения документа. Широкие таблицы сохраняют свой внутренний скролл.

Тест контраста подтверждает минимум 4.5:1 для success/danger/warning на соответствующем soft-фоне, surface и bg в обеих темах. Цвет не заменяет подпись статуса, доступные labels, символы результата или иконки.

Статическая проверка охватывает все административные маршруты; браузерная — перечисленные типовые страницы с локальными данными, а не реальные производственные записи каждого раздела. Стенд и его данные находятся в игнорируемой `.deploy.local/admin-status`, в production-сборку не входят.

## Проверки

- `npm run lint` — exit 0, ошибок нет. Восемь существующих предупреждений в неизменённых файлах: `Icon.tsx:305`, `i18n.tsx:118`, `theme.tsx:53,78`, `SegmentedControl.tsx:49`, `OtpInput.tsx:31`, `auth/links.tsx:18,38`.
- `npx tsc -b` — exit 0.
- `node --experimental-strip-types --test --test-reporter=spec tests/*.test.mjs` — 282/282, без падений и пропусков. Добавлены девять тестов цветов, контекстов, неизвестных значений, KPI, направления динамики и контраста. Загрузчики десяти существующих тестов подключают реальный общий helper.
- `npm run build` (public) — exit 0.
- `npm run build:admin` — exit 0.
- Обе сборки сообщают предупреждение о чанках больше 500 kB; это не ошибка сборки.
- `git diff --check` — без ошибок.

API, мутации, права доступа, бизнес-правила и production-данные не изменялись. Реальные операции оплаты, модерации и публикации не выполнялись. Коммит, push и deploy в этот этап не входят.

## Изменённые файлы

- `docs/ADMIN_STATUS_COLORS.md`
- `src/admin/AdminLayout.module.css`
- `src/admin/campaigns/CampaignsPage.tsx`
- `src/admin/campaigns/details/CampaignDetailPage.tsx`
- `src/admin/campaigns/details/CreativeDetails.tsx`
- `src/admin/campaigns/details/FinanceDetails.tsx`
- `src/admin/campaigns/model.ts`
- `src/admin/clients/details/ClientDetailPage.tsx`
- `src/admin/clients/details/ClientRecords.tsx`
- `src/admin/corporate-requests/CorporateRequestPage.tsx`
- `src/admin/equipment/EquipmentFilters.tsx`
- `src/admin/equipment/EquipmentResults.tsx`
- `src/admin/equipment/StorePicker.tsx`
- `src/admin/invoices/details/InvoiceDetailPage.tsx`
- `src/admin/invoices/details/InvoiceFields.tsx`
- `src/admin/invoices/InvoiceResults.tsx`
- `src/admin/invoices/model.ts`
- `src/admin/overview/OverviewCounter.tsx`
- `src/admin/overview/OverviewPage.module.css`
- `src/admin/partner/PartnerPage.tsx`
- `src/admin/roles/CartRoutePage.tsx`
- `src/admin/statusTone.ts`
- `src/admin/stores/details/StoreDetailPage.tsx`
- `src/admin/stores/details/StoreFields.tsx`
- `src/admin/stores/details/StoreRecords.tsx`
- `src/admin/stores/details/StoreRecordTables.tsx`
- `src/admin/stores/onboarding/plan/StorePlanStep.tsx`
- `src/admin/stores/onboarding/review/Review.module.css`
- `src/admin/stores/onboarding/review/StoreReviewStep.tsx`
- `src/admin/stores/onboarding/StoreRequestForm.tsx`
- `src/admin/stores/onboarding/zoning/StoreZoningStep.tsx`
- `src/admin/stores/owner/OwnerDecision.tsx`
- `src/admin/stores/owner/StoreRequestsHome.tsx`
- `src/admin/stores/requests/model.ts`
- `src/admin/stores/StoreResults.tsx`
- `src/admin/tariffs/TariffResults.tsx`
- `src/admin/tariffs/TariffTable.tsx`
- `src/auth/RequirePermission.tsx`
- `tests/admin-client-detail.test.mjs`
- `tests/admin-equipment.test.mjs`
- `tests/admin-invoice-payment.test.mjs`
- `tests/admin-moderation.test.mjs`
- `tests/admin-status-colors.test.mjs`
- `tests/admin-store-owner.test.mjs`
- `tests/admin-store-plan.test.mjs`
- `tests/admin-store-request.test.mjs`
- `tests/admin-store-requests.test.mjs`
- `tests/admin-store-review.test.mjs`
- `tests/admin-tariffs.test.mjs`

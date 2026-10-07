# Apexmedia — справочник структуры БД

[Обзор проекта](TECHNICAL_OVERVIEW.md) · [Деплой](DEPLOYMENT.md)

**Снимок: 7 октября 2026 года, `main` `ae03ddd`.** Источник: [src/lib/database.types.ts](../src/lib/database.types.ts), сгенерированный для public schema проекта Apex (`eveylcsziemhqouazebu`). Данные пользователей и секреты в этот справочник не включены.

## Как читать справочник

В контракте: **33 таблицы, 39 views, 250 функций и 2 enum**. Ниже перечислены все таблицы и views, а также 32 прикладных/служебных RPC; пространственные функции PostGIS не расписываются.

- Типы ниже — TypeScript после сериализации API, а не SQL-типы. `string` может быть UUID, text, date или timestamp; `number` — integer/numeric и другие числовые типы.
- Nullable взят из `Row`. ¹ `unknown` поглощает null в TypeScript; `Json` тоже допускает null. Для этих полей nullability следует проверять в SQL. Nullable полей views часто консервативен.
- Связи приведены из `Relationships` только с базовыми таблицами. Повторные ссылки на представления, которые генератор вывел через один FK, опущены. Связи с `auth`/`storage` могут не попасть в этот public-only контракт.
- Отсутствие связи здесь не доказывает отсутствие FK в SQL. Наличие поля `id` не доказывает, что оно PK. Точные PK, UNIQUE, CHECK, DEFAULT, ON DELETE, индексы, RLS, grants, триггеры и тела функций в generated types не содержатся.
- Наличие объекта в типах не означает, что его разрешено читать или вызывать из браузера. `admin_*` и `_campaign_*` не подключать к рекламодательскому UI без проверки серверных прав.
- Описания второстепенных объектов основаны на названиях и полях; их полную бизнес-семантику уточнять у владельца бэкенда.

## Карта таблиц

| Таблица | Назначение |
| --- | --- |
| [ad_budget_portions](#table-ad-budget-portions) | Части бюджета кампании: сумма, расход, цена показа, порядок и связь со счётом. |
| [ad_stores](#table-ad-stores) | Связь кампании с магазинами; также распределённая стоимость и фактическая оплата. |
| [ad_view_history](#table-ad-view-history) | История показов с кампанией, тележкой, магазином, зоной и длительностью. Семантику отличий от playback_logs уточнять по серверным функциям. |
| [ad_zones](#table-ad-zones) | Связь кампании с зонами; счётчик срабатываний. |
| [ads](#table-ads) | Основная запись рекламной кампании: владелец, статус, тариф, бюджет, видео, обложка и модерация. |
| [ads_backup_20261006](#table-ads-backup-20261006) | Датированный снимок части полей ads. Фронтенд не использует; наличие этой таблицы не заменяет резервное копирование БД. |
| [advertiser_invoices](#table-advertiser-invoices) | Счета рекламодателю: кампания, сумма, статус, получатель, версия тарифа, цена показа. |
| [auction_bids](#table-auction-bids) | Ставки аукционов; текущий кабинет этот сценарий не подключает. |
| [auctions](#table-auctions) | Аукционы площадок/зон; текущий кабинет этот сценарий не подключает. |
| [audit_log](#table-audit-log) | Журнал изменений: исполнитель, сущность, действие, состояния before/after. |
| [beacons](#table-beacons) | Маяки и их привязка к магазину/зоне. |
| [cartplayer_playback_sessions](#table-cartplayer-playback-sessions) | Подготовленные и завершённые сессии воспроизведения; планшетный сценарий вне этого UI. |
| [carts](#table-carts) | Тележки: магазин, зона, статус, заряд, поля последнего сигнала и назначения. |
| [corporate_requests](#table-corporate-requests) | Корпоративные заявки из соответствующей формы и их обработка менеджером. |
| [creative_comments](#table-creative-comments) | Комментарии к креативам со стороны пользователей/партнёров. |
| [documents](#table-documents) | Метаданные документов пользователей. Юридические страницы фронтенда берут тексты из файлов, не из этой таблицы. |
| [filtr](#table-filtr) | Справочный объект с ru/en. Назначение не установлено по текущему фронтенду; не используется его API. |
| [invoices](#table-invoices) | Отдельные счета, связанные с кампанией и магазином. Отличается от advertiser_invoices; к ней привязана payments. |
| [notifications](#table-notifications) | Уведомления пользователя/партнёра с привязкой к сущности. |
| [partner_payouts](#table-partner-payouts) | Выплаты по начислениям партнёров. |
| [partner_revenue](#table-partner-revenue) | Доход и доли Apex/партнёра за период. |
| [partners](#table-partners) | Партнёры, юридическое название и тип договора. |
| [payments](#table-payments) | Платежи по invoices. Не считать автоматически платежами по advertiser_invoices. |
| [playback_logs](#table-playback-logs) | События воспроизведения: кампания, тележка, зона, время, длительность, completed и trigger_type. |
| [reports](#table-reports) | Метаданные отчётов партнёров за период. |
| [spatial_ref_sys](#table-spatial-ref-sys) | Служебный справочник систем координат PostGIS. |
| [store_daily_stats](#table-store-daily-stats) | Сохранённые дневные итоги магазина. Аналитика использует store_id, stat_date, total_plays. |
| [stores](#table-stores) | Магазины: название, адрес, город, партнёр и timezone. |
| [support_tickets](#table-support-tickets) | Обращения поддержки пользователя/партнёра; UI обращений в этом кабинете отсутствует. |
| [tariffs](#table-tariffs) | Справочник тарифов, минимального бюджета, цены показа, версии и возможностей. |
| [user_store_access](#table-user-store-access) | Связь пользователей с доступными магазинами; прямого использования в текущем frontend API нет. |
| [users](#table-users) | Профили и бизнес-поля. Вход и подтверждения контактов управляются Supabase Auth отдельно. |
| [zones](#table-zones) | Зоны магазина: название, описание, значок и price_per_hour. Мастер получает каталог через RPC. |

## Enum

### ad_status

```typescript
"pending" | "awaiting_payment" | "active" | "rejected" | "draft" | "archived" | "deleted" | "paused" | "hours_ended" | "budget_ended" | "completed"
```

### cart_status

```typescript
"active" | "inactive" | "maintenance" | "online" | "offline"
```

`cart_status.active` и `cart_status.online` — отдельные значения. Нельзя заменять один другим в расчёте доступности оборудования без решения на стороне источника.

## Таблицы

### Table ad-budget-portions

SQL-имя: `public.ad_budget_portions`. Части бюджета кампании: сумма, расход, цена показа, порядок и связь со счётом.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Нет |
| `amount` | `number` | Нет |
| `created_at` | `string` | Нет |
| `id` | `string` | Нет |
| `invoice_id` | `string` | Да |
| `position` | `number` | Нет |
| `price_per_play` | `number` | Нет |
| `spent` | `number` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `ad_id` | `ads(id)` | `ad_budget_portions_ad_id_fkey` |
| `invoice_id` | `advertiser_invoices(id)` | `ad_budget_portions_invoice_id_fkey` |

### Table ad-stores

SQL-имя: `public.ad_stores`. Связь кампании с магазинами; также распределённая стоимость и фактическая оплата.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `actually_paid` | `number` | Да |
| `ad_id` | `string` | Да |
| `allocated_cost` | `number` | Да |
| `created_at` | `string` | Да |
| `id` | `string` | Нет |
| `status` | `string` | Да |
| `store_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `ad_id` | `ads(id)` | `ad_stores_ad_id_fkey` |
| `store_id` | `stores(id)` | `ad_stores_store_id_fkey` |

### Table ad-view-history

SQL-имя: `public.ad_view_history`. История показов с кампанией, тележкой, магазином, зоной и длительностью. Семантику отличий от playback_logs уточнять по серверным функциям.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `cart_id` | `string` | Да |
| `created_at` | `string` | Да |
| `duration_seconds` | `number` | Да |
| `id` | `string` | Нет |
| `location` | `unknown` | См. SQL¹ |
| `store_id` | `string` | Да |
| `user_id` | `string` | Да |
| `viewed_at` | `string` | Да |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `ad_id` | `ads(id)` | `ad_view_history_ad_id_fkey` |
| `cart_id` | `carts(id)` | `ad_view_history_cart_id_fkey` |
| `store_id` | `stores(id)` | `ad_view_history_store_id_fkey` |
| `zone_id` | `zones(id)` | `ad_view_history_zone_id_fkey` |

### Table ad-zones

SQL-имя: `public.ad_zones`. Связь кампании с зонами; счётчик срабатываний.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `created_at` | `string` | Да |
| `id` | `string` | Нет |
| `trigger_count` | `number` | Да |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `ad_id` | `ads(id)` | `ad_zones_ad_id_fkey` |
| `zone_id` | `zones(id)` | `ad_zones_zone_id_fkey` |

### Table ads

SQL-имя: `public.ads`. Основная запись рекламной кампании: владелец, статус, тариф, бюджет, видео, обложка и модерация.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `budget` | `number` | Да |
| `budget_used_pct` | `number` | Да |
| `content_url` | `string` | Да |
| `cover_original_filename` | `string` | Да |
| `created_at` | `string` | Да |
| `description` | `string` | Да |
| `display_id` | `number` | Нет |
| `earned_points` | `number` | Да |
| `end_date` | `string` | Да |
| `hours_per_day` | `number` | Да |
| `hours_used_pct` | `number` | Да |
| `id` | `string` | Нет |
| `is_active` | `boolean` | Да |
| `moderated_at` | `string` | Да |
| `moderated_by` | `string` | Да |
| `moderator_comment` | `string` | Да |
| `name` | `string` | Да |
| `paid_amount` | `number` | Нет |
| `plays_count` | `number` | Нет |
| `price_per_play` | `number` | Да |
| `rejection_reasons` | `string[]` | Да |
| `remaining_budget_pct` | `number` | Да |
| `remaining_impressions` | `number` | Да |
| `request_id` | `string` | Да |
| `spent_budget` | `number` | Нет |
| `start_date` | `string` | Да |
| `status` | `ad_status` | Да |
| `status_color` | `string` | Да |
| `status_label_ru` | `string` | Да |
| `store_id` | `string` | Да |
| `store_name` | `string` | Да |
| `submitted_at` | `string` | Да |
| `tariff_id` | `string` | Да |
| `title` | `string` | Да |
| `total_hours` | `number` | Да |
| `used_hours` | `number` | Да |
| `user_id` | `string` | Да |
| `video_duration_sec` | `number` | Да |
| `video_height` | `number` | Да |
| `video_original_filename` | `string` | Да |
| `video_size_bytes` | `number` | Да |
| `video_url` | `string` | Да |
| `video_width` | `number` | Да |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `store_id` | `stores(id)` | `ads_store_id_fkey` |
| `tariff_id` | `tariffs(id)` | `ads_tariff_id_fkey` |
| `zone_id` | `zones(id)` | `ads_zone_id_fkey` |

### Table ads-backup-20261006

SQL-имя: `public.ads_backup_20261006`. Датированный снимок части полей ads. Фронтенд не использует; наличие этой таблицы не заменяет резервное копирование БД.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `budget` | `number` | Да |
| `display_id` | `number` | Да |
| `hours_per_day` | `number` | Да |
| `id` | `string` | Да |
| `status` | `ad_status` | Да |
| `total_hours` | `number` | Да |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table advertiser-invoices

SQL-имя: `public.advertiser_invoices`. Счета рекламодателю: кампания, сумма, статус, получатель, версия тарифа, цена показа.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Нет |
| `amount` | `number` | Нет |
| `file_url` | `string` | Да |
| `id` | `string` | Нет |
| `issued_at` | `string` | Нет |
| `kind` | `string` | Нет |
| `number` | `number` | Нет |
| `paid_at` | `string` | Да |
| `paid_by` | `string` | Да |
| `price_per_play` | `number` | Да |
| `sent_to` | `string` | Да |
| `status` | `string` | Нет |
| `tariff_version` | `number` | Да |
| `user_id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `ad_id` | `ads(id)` | `advertiser_invoices_ad_id_fkey` |

### Table auction-bids

SQL-имя: `public.auction_bids`. Ставки аукционов; текущий кабинет этот сценарий не подключает.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `amount` | `number` | Да |
| `auction_id` | `string` | Да |
| `created_at` | `string` | Да |
| `id` | `string` | Нет |
| `user_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `auction_id` | `auctions(id)` | `auction_bids_auction_id_fkey` |

### Table auctions

SQL-имя: `public.auctions`. Аукционы площадок/зон; текущий кабинет этот сценарий не подключает.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `created_at` | `string` | Да |
| `current_price` | `number` | Да |
| `description` | `string` | Да |
| `end_at` | `string` | Да |
| `hourly_traffic` | `number` | Да |
| `id` | `string` | Нет |
| `min_bid` | `number` | Да |
| `min_bid_step` | `number` | Да |
| `start_at` | `string` | Да |
| `status` | `string` | Да |
| `store_id` | `string` | Да |
| `title` | `string` | Да |
| `updated_at` | `string` | Да |
| `winner_id` | `string` | Да |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `store_id` | `stores(id)` | `auctions_store_id_fkey` |
| `zone_id` | `zones(id)` | `auctions_zone_id_fkey` |

### Table audit-log

SQL-имя: `public.audit_log`. Журнал изменений: исполнитель, сущность, действие, состояния before/after.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `action` | `string` | Нет |
| `actor_user_id` | `string` | Да |
| `after` | `Json` | Да |
| `before` | `Json` | Да |
| `created_at` | `string` | Нет |
| `entity_id` | `string` | Да |
| `entity_type` | `string` | Нет |
| `id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `actor_user_id` | `users(id)` | `audit_log_actor_user_id_fkey` |

### Table beacons

SQL-имя: `public.beacons`. Маяки и их привязка к магазину/зоне.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `box_number` | `string` | Да |
| `created_at` | `string` | Да |
| `device_identifier` | `string` | Да |
| `id` | `string` | Нет |
| `status` | `string` | Да |
| `store_id` | `string` | Да |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `store_id` | `stores(id)` | `beacons_store_id_fkey` |
| `zone_id` | `zones(id)` | `beacons_zone_id_fkey` |

### Table cartplayer-playback-sessions

SQL-имя: `public.cartplayer_playback_sessions`. Подготовленные и завершённые сессии воспроизведения; планшетный сценарий вне этого UI.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Нет |
| `cart_id` | `string` | Нет |
| `completed_at` | `string` | Да |
| `duration_seconds` | `number` | Да |
| `id` | `string` | Нет |
| `prepared_at` | `string` | Нет |
| `user_id` | `string` | Нет |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table carts

SQL-имя: `public.carts`. Тележки: магазин, зона, статус, заряд, поля последнего сигнала и назначения.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `assigned_user_id` | `string` | Да |
| `battery_level` | `number` | Да |
| `cart_number` | `string` | Да |
| `created_at` | `string` | Да |
| `current_zone_id` | `string` | Да |
| `display_id` | `number` | Нет |
| `id` | `string` | Нет |
| `last_location` | `unknown` | См. SQL¹ |
| `last_ping_at` | `string` | Да |
| `last_seen_at` | `string` | Да |
| `last_zone_entered_at` | `string` | Да |
| `status` | `cart_status` | Да |
| `store_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `assigned_user_id` | `users(id)` | `carts_assigned_user_id_fkey` |
| `current_zone_id` | `zones(id)` | `carts_current_zone_id_fkey` |
| `store_id` | `stores(id)` | `carts_store_id_fkey` |

### Table corporate-requests

SQL-имя: `public.corporate_requests`. Корпоративные заявки из соответствующей формы и их обработка менеджером.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `company` | `string` | Нет |
| `contact_name` | `string` | Да |
| `created_at` | `string` | Нет |
| `email` | `string` | Да |
| `id` | `string` | Нет |
| `manager_comment` | `string` | Да |
| `message` | `string` | Да |
| `phone` | `string` | Нет |
| `status` | `string` | Нет |
| `updated_at` | `string` | Нет |
| `user_id` | `string` | Да |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table creative-comments

SQL-имя: `public.creative_comments`. Комментарии к креативам со стороны пользователей/партнёров.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `comment` | `string` | Нет |
| `created_at` | `string` | Нет |
| `creative_id` | `string` | Нет |
| `id` | `string` | Нет |
| `partner_id` | `string` | Нет |
| `status` | `string` | Нет |
| `user_id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `creative_id` | `ads(id)` | `creative_comments_creative_id_fkey` |
| `partner_id` | `partners(id)` | `creative_comments_partner_id_fkey` |
| `user_id` | `users(id)` | `creative_comments_user_id_fkey` |

### Table documents

SQL-имя: `public.documents`. Метаданные документов пользователей. Юридические страницы фронтенда берут тексты из файлов, не из этой таблицы.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `created_at` | `string` | Да |
| `description` | `string` | Да |
| `file_path` | `string` | Да |
| `file_size` | `number` | Да |
| `file_type` | `string` | Да |
| `file_url` | `string` | Да |
| `id` | `string` | Нет |
| `status` | `string` | Да |
| `title` | `string` | Да |
| `updated_at` | `string` | Да |
| `user_id` | `string` | Да |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table filtr

SQL-имя: `public.filtr`. Справочный объект с ru/en. Назначение не установлено по текущему фронтенду; не используется его API.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `en` | `string` | Да |
| `id` | `string` | Нет |
| `ru` | `string` | Да |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table invoices

SQL-имя: `public.invoices`. Отдельные счета, связанные с кампанией и магазином. Отличается от advertiser_invoices; к ней привязана payments.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `amount` | `number` | Нет |
| `campaign_id` | `string` | Нет |
| `due_at` | `string` | Да |
| `id` | `string` | Нет |
| `issued_at` | `string` | Нет |
| `status` | `string` | Нет |
| `store_id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `campaign_id` | `ads(id)` | `invoices_campaign_id_fkey` |
| `store_id` | `stores(id)` | `invoices_store_id_fkey` |

### Table notifications

SQL-имя: `public.notifications`. Уведомления пользователя/партнёра с привязкой к сущности.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `created_at` | `string` | Нет |
| `id` | `string` | Нет |
| `message` | `string` | Нет |
| `partner_id` | `string` | Да |
| `read_at` | `string` | Да |
| `related_entity_id` | `string` | Да |
| `related_entity_type` | `string` | Да |
| `type` | `string` | Нет |
| `user_id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_id` | `partners(id)` | `notifications_partner_id_fkey` |
| `user_id` | `users(id)` | `notifications_user_id_fkey` |

### Table partner-payouts

SQL-имя: `public.partner_payouts`. Выплаты по начислениям партнёров.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `accrued_amount` | `number` | Нет |
| `id` | `string` | Нет |
| `paid_amount` | `number` | Нет |
| `partner_revenue_id` | `string` | Нет |
| `payout_date` | `string` | Да |
| `remaining_amount` | `number` | Нет |
| `status` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_revenue_id` | `partner_revenue(id)` | `partner_payouts_partner_revenue_id_fkey` |

### Table partner-revenue

SQL-имя: `public.partner_revenue`. Доход и доли Apex/партнёра за период.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `apex_share` | `number` | Нет |
| `created_at` | `string` | Нет |
| `id` | `string` | Нет |
| `model` | `string` | Нет |
| `partner_id` | `string` | Нет |
| `partner_share` | `number` | Нет |
| `period` | `unknown` | См. SQL¹ |
| `store_id` | `string` | Да |
| `total_ad_revenue` | `number` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_id` | `partners(id)` | `partner_revenue_partner_id_fkey` |
| `store_id` | `stores(id)` | `partner_revenue_store_id_fkey` |

### Table partners

SQL-имя: `public.partners`. Партнёры, юридическое название и тип договора.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `contract_type` | `string` | Нет |
| `created_at` | `string` | Нет |
| `id` | `string` | Нет |
| `legal_name` | `string` | Да |
| `name` | `string` | Нет |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table payments

SQL-имя: `public.payments`. Платежи по invoices. Не считать автоматически платежами по advertiser_invoices.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `amount` | `number` | Нет |
| `id` | `string` | Нет |
| `invoice_id` | `string` | Нет |
| `method` | `string` | Да |
| `paid_at` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `invoice_id` | `invoices(id)` | `payments_invoice_id_fkey` |

### Table playback-logs

SQL-имя: `public.playback_logs`. События воспроизведения: кампания, тележка, зона, время, длительность, completed и trigger_type.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `cart_id` | `string` | Да |
| `completed` | `boolean` | Нет |
| `duration_seconds` | `number` | Да |
| `id` | `string` | Нет |
| `location` | `unknown` | См. SQL¹ |
| `played_at` | `string` | Да |
| `trigger_type` | `string` | Нет |
| `zone_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `ad_id` | `ads(id)` | `playback_logs_ad_id_fkey` |
| `cart_id` | `carts(id)` | `playback_logs_cart_id_fkey` |
| `zone_id` | `zones(id)` | `playback_logs_zone_id_fkey` |

### Table reports

SQL-имя: `public.reports`. Метаданные отчётов партнёров за период.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `file_url` | `string` | Да |
| `format` | `string` | Нет |
| `generated_at` | `string` | Нет |
| `id` | `string` | Нет |
| `partner_id` | `string` | Нет |
| `period_end` | `string` | Нет |
| `period_start` | `string` | Нет |
| `store_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_id` | `partners(id)` | `reports_partner_id_fkey` |
| `store_id` | `stores(id)` | `reports_store_id_fkey` |

### Table spatial-ref-sys

SQL-имя: `public.spatial_ref_sys`. Служебный справочник систем координат PostGIS.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `auth_name` | `string` | Да |
| `auth_srid` | `number` | Да |
| `proj4text` | `string` | Да |
| `srid` | `number` | Нет |
| `srtext` | `string` | Да |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table store-daily-stats

SQL-имя: `public.store_daily_stats`. Сохранённые дневные итоги магазина. Аналитика использует store_id, stat_date, total_plays.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `bar_height` | `number` | Да |
| `day_index` | `number` | Да |
| `day_number` | `number` | Да |
| `stat_date` | `string` | Нет |
| `store_id` | `string` | Нет |
| `total_plays` | `number` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `store_id` | `stores(id)` | `store_daily_stats_store_id_fkey` |

### Table stores

SQL-имя: `public.stores`. Магазины: название, адрес, город, партнёр и timezone.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `address` | `string` | Да |
| `cart_ids` | `string[]` | Да |
| `city` | `string` | Да |
| `created_at` | `string` | Да |
| `id` | `string` | Нет |
| `name` | `string` | Нет |
| `partner_id` | `string` | Да |
| `timezone` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_id` | `partners(id)` | `stores_partner_id_fkey` |

### Table support-tickets

SQL-имя: `public.support_tickets`. Обращения поддержки пользователя/партнёра; UI обращений в этом кабинете отсутствует.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `category` | `string` | Нет |
| `created_at` | `string` | Нет |
| `description` | `string` | Да |
| `id` | `string` | Нет |
| `partner_id` | `string` | Нет |
| `status` | `string` | Нет |
| `subject` | `string` | Нет |
| `user_id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_id` | `partners(id)` | `support_tickets_partner_id_fkey` |
| `user_id` | `users(id)` | `support_tickets_user_id_fkey` |

### Table tariffs

SQL-имя: `public.tariffs`. Справочник тарифов, минимального бюджета, цены показа, версии и возможностей.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `badge` | `string` | Да |
| `can_select_store` | `boolean` | Нет |
| `can_select_zone` | `boolean` | Нет |
| `code` | `string` | Да |
| `created_at` | `string` | Нет |
| `exclusive_zone` | `boolean` | Нет |
| `has_sound` | `boolean` | Нет |
| `id` | `string` | Нет |
| `is_archived` | `boolean` | Нет |
| `min_amount` | `number` | Нет |
| `more_plays` | `boolean` | Нет |
| `name` | `string` | Нет |
| `price_per_play` | `number` | Нет |
| `purchasable` | `boolean` | Нет |
| `sort_order` | `number` | Нет |
| `updated_at` | `string` | Нет |
| `version` | `number` | Нет |

Связи с базовыми таблицами в этом generated-контракте не перечислены.

### Table user-store-access

SQL-имя: `public.user_store_access`. Связь пользователей с доступными магазинами; прямого использования в текущем frontend API нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `created_at` | `string` | Нет |
| `id` | `string` | Нет |
| `store_id` | `string` | Нет |
| `user_id` | `string` | Нет |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `store_id` | `stores(id)` | `user_store_access_store_id_fkey` |
| `user_id` | `users(id)` | `user_store_access_user_id_fkey` |

### Table users

SQL-имя: `public.users`. Профили и бизнес-поля. Вход и подтверждения контактов управляются Supabase Auth отдельно.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `avatar_url` | `string` | Да |
| `balance` | `number` | Да |
| `bin` | `string` | Да |
| `company_name` | `string` | Да |
| `created_at` | `string` | Да |
| `display_id` | `number` | Нет |
| `display_name` | `string` | Да |
| `email` | `string` | Да |
| `finance_visible` | `boolean` | Нет |
| `full_name` | `string` | Да |
| `id` | `string` | Нет |
| `is_active` | `boolean` | Да |
| `partner_id` | `string` | Да |
| `partner_role` | `string` | Да |
| `phone` | `string` | Да |
| `role` | `string` | Да |
| `updated_at` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `partner_id` | `partners(id)` | `users_partner_id_fkey` |

### Table zones

SQL-имя: `public.zones`. Зоны магазина: название, описание, значок и price_per_hour. Мастер получает каталог через RPC.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `created_at` | `string` | Да |
| `description` | `string` | Да |
| `icon_emoji` | `string` | Нет |
| `id` | `string` | Нет |
| `name` | `string` | Нет |
| `price_per_hour` | `number` | Нет |
| `store_id` | `string` | Да |

Связи с базовыми таблицами в generated types:

| Поля | Ссылка | Имя FK |
| --- | --- | --- |
| `store_id` | `stores(id)` | `zones_store_id_fkey` |

## Представления (views)

Текущий фронтенд непосредственно запрашивает четыре views: `my_campaigns_stats`, `my_daily_plays_by_campaign`, `store_cart_connectivity`, `store_stats`. Остальные присутствуют в типах и могут использоваться другими клиентами или будущими разделами.

| Группа | Назначение / ограничение |
| --- | --- |
| `my_*` | Персональные агрегаты/распределение кампаний; основные источники кабинета рекламодателя |
| `store_*`, `zone_stats` | Агрегаты площадок и оборудования; аналитика читает выбранные из них |
| `partner_*` | Партнёрский контур; его экраны не реализованы в этом репозитории |
| `advertiser_*`, `ad_*`, `user_ad_stats`, `broad_target_campaign_stats` | Другие срезы кампаний; не подменять ими `my_*` без проверки определения/видимости |
| `all_*`, `global_ad_stats` | Общие показатели; не являются автоматически статистикой текущего пользователя |
| `geography_columns`, `geometry_columns` | Метаданные PostGIS |

Названия не доказывают фильтрацию по `auth.uid()` или применение RLS: для этого требуется SQL-определение view и проверка её режима/прав.

### View ad_campaign_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `earned_points` | `number` | Да |
| `name` | `string` | Да |
| `plays_month` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `title` | `string` | Да |
| `total_plays` | `number` | Да |
| `user_id` | `string` | Да |

### View ad_store_names

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `store_name` | `string` | Да |

### View ad_zone_names

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `zone_id` | `string` | Да |
| `zone_name` | `string` | Да |

### View advertiser_campaign_cards

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `budget` | `number` | Да |
| `budget_used` | `number` | Да |
| `hours_progress_pct` | `number` | Да |
| `name` | `string` | Да |
| `status` | `ad_status` | Да |
| `status_color` | `string` | Да |
| `status_label_ru` | `string` | Да |
| `thumbnail_url` | `string` | Да |
| `total_hours` | `number` | Да |
| `used_hours` | `number` | Да |
| `user_id` | `string` | Да |

### View advertiser_daily_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `stat_date` | `string` | Да |
| `total_plays` | `number` | Да |
| `user_id` | `string` | Да |

### View advertiser_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `content_url` | `string` | Да |
| `created_at` | `string` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `status` | `ad_status` | Да |
| `title` | `string` | Да |
| `total_plays` | `number` | Да |
| `user_id` | `string` | Да |

### View advertiser_total_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `total_ads` | `number` | Да |
| `total_plays` | `number` | Да |
| `user_id` | `string` | Да |

### View all_cart_fleet

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `avg_battery_level` | `number` | Да |
| `low_battery_count` | `number` | Да |
| `offline_carts` | `number` | Да |
| `online_carts` | `number` | Да |
| `total_carts` | `number` | Да |

### View all_store

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays_month` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `stores_count` | `number` | Да |
| `total_plays` | `number` | Да |

### View all_store_daily

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `bar_height` | `number` | Да |
| `day_index` | `number` | Да |
| `day_number` | `number` | Да |
| `stat_date` | `string` | Да |
| `total_plays` | `number` | Да |

### View all_zone

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays_last_24h` | `number` | Да |
| `zones_count` | `number` | Да |

### View all_zone_top

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `pct_share` | `number` | Да |
| `plays_last_24h` | `number` | Да |
| `store_name` | `string` | Да |
| `zone_id` | `string` | Да |
| `zone_name` | `string` | Да |
| `zone_rank` | `number` | Да |

### View broad_target_campaign_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `stores_reached` | `number` | Да |
| `targets_all_stores` | `boolean` | Да |
| `targets_all_zones` | `boolean` | Да |
| `title` | `string` | Да |
| `total_plays` | `number` | Да |
| `user_id` | `string` | Да |
| `zones_reached` | `number` | Да |

### View geography_columns

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `coord_dimension` | `number` | Да |
| `f_geography_column` | `unknown` | См. SQL¹ |
| `f_table_catalog` | `unknown` | См. SQL¹ |
| `f_table_name` | `unknown` | См. SQL¹ |
| `f_table_schema` | `unknown` | См. SQL¹ |
| `srid` | `number` | Да |
| `type` | `string` | Да |

### View geometry_columns

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `coord_dimension` | `number` | Да |
| `f_geometry_column` | `unknown` | См. SQL¹ |
| `f_table_catalog` | `string` | Да |
| `f_table_name` | `unknown` | См. SQL¹ |
| `f_table_schema` | `unknown` | См. SQL¹ |
| `srid` | `number` | Да |
| `type` | `string` | Да |

### View global_ad_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays_month` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `total_plays` | `number` | Да |

### View my_ad_stats_summary

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays_month` | `number` | Да |
| `plays_prev_week` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_total` | `number` | Да |
| `plays_week` | `number` | Да |
| `plays_yesterday` | `number` | Да |

### View my_campaign_locations

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `kind` | `string` | Да |
| `location_id` | `string` | Да |
| `location_name` | `string` | Да |
| `parent_store_id` | `string` | Да |

### View my_campaign_store_shares

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `store_id` | `string` | Да |
| `store_name` | `string` | Да |
| `store_plays` | `number` | Да |
| `store_share_fraction` | `number` | Да |
| `store_share_pct` | `number` | Да |

### View my_campaign_zone_shares

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `zone_id` | `string` | Да |
| `zone_name` | `string` | Да |
| `zone_plays` | `number` | Да |
| `zone_rank` | `number` | Да |
| `zone_share_fraction` | `number` | Да |
| `zone_share_pct` | `number` | Да |

### View my_campaigns_stats

**Используется текущим фронтендом.**

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `budget` | `number` | Да |
| `budget_used_fraction` | `number` | Да |
| `budget_used_pct` | `number` | Да |
| `cart_count` | `number` | Да |
| `content_url` | `string` | Да |
| `created_at` | `string` | Да |
| `description` | `string` | Да |
| `end_date` | `string` | Да |
| `hours_used_fraction` | `number` | Да |
| `hours_used_pct` | `number` | Да |
| `invoice_amount` | `number` | Да |
| `invoice_sent_to` | `string` | Да |
| `moderated_at` | `string` | Да |
| `moderator_comment` | `string` | Да |
| `name` | `string` | Да |
| `paid_amount` | `number` | Да |
| `plays_count` | `number` | Да |
| `price_per_play` | `number` | Да |
| `rejection_reasons` | `string[]` | Да |
| `remaining_budget` | `number` | Да |
| `remaining_budget_pct` | `number` | Да |
| `spent_budget` | `number` | Да |
| `start_date` | `string` | Да |
| `status` | `ad_status` | Да |
| `status_color` | `string` | Да |
| `status_label_ru` | `string` | Да |
| `store_count` | `number` | Да |
| `store_name` | `string` | Да |
| `submitted_at` | `string` | Да |
| `tariff_can_extend` | `boolean` | Да |
| `tariff_code` | `string` | Да |
| `tariff_current_price` | `number` | Да |
| `tariff_min_amount` | `number` | Да |
| `tariff_name` | `string` | Да |
| `tariff_version` | `number` | Да |
| `title` | `string` | Да |
| `total_hours` | `number` | Да |
| `total_plays` | `number` | Да |
| `unpaid_amount` | `number` | Да |
| `used_hours` | `number` | Да |
| `video_duration_sec` | `number` | Да |
| `video_url` | `string` | Да |

### View my_daily_plays

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `play_date` | `string` | Да |
| `plays` | `number` | Да |

### View my_daily_plays_all_campaigns

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `play_date` | `string` | Да |
| `plays` | `number` | Да |

### View my_daily_plays_by_campaign

**Используется текущим фронтендом.**

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `ad_id` | `string` | Да |
| `play_date` | `string` | Да |
| `plays` | `number` | Да |

### View partner_campaign_view

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `actually_paid` | `number` | Да |
| `actually_paid_label` | `string` | Да |
| `allocated_cost` | `number` | Да |
| `allocated_cost_label` | `string` | Да |
| `budget_progress` | `number` | Да |
| `end_date` | `string` | Да |
| `id` | `string` | Да |
| `impressions_label` | `string` | Да |
| `name` | `string` | Да |
| `start_date` | `string` | Да |
| `status` | `ad_status` | Да |
| `status_label_ru` | `string` | Да |
| `store_id` | `string` | Да |
| `store_status` | `string` | Да |
| `time_progress` | `number` | Да |
| `time_total_label` | `string` | Да |
| `time_used_label` | `string` | Да |
| `title` | `string` | Да |

### View partner_dashboard_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `active_advertisers` | `number` | Да |
| `active_campaigns` | `number` | Да |
| `carts_offline` | `number` | Да |
| `carts_online` | `number` | Да |
| `carts_total` | `number` | Да |
| `completed_campaigns` | `number` | Да |
| `devices_offline` | `number` | Да |
| `devices_online` | `number` | Да |
| `devices_total` | `number` | Да |
| `impressions_month_label` | `string` | Да |
| `impressions_today_label` | `string` | Да |
| `impressions_week_label` | `string` | Да |
| `total_cost` | `number` | Да |
| `total_cost_label` | `string` | Да |
| `total_impressions` | `number` | Да |
| `total_impressions_label` | `string` | Да |
| `total_paid` | `number` | Да |
| `total_paid_label` | `string` | Да |

### View partner_dashboard_stats_by_store

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `active_advertisers` | `number` | Да |
| `active_campaigns` | `number` | Да |
| `carts_offline` | `number` | Да |
| `carts_online` | `number` | Да |
| `carts_total` | `number` | Да |
| `completed_campaigns` | `number` | Да |
| `devices_offline` | `number` | Да |
| `devices_online` | `number` | Да |
| `devices_total` | `number` | Да |
| `impressions_month_label` | `string` | Да |
| `impressions_today_label` | `string` | Да |
| `impressions_week_label` | `string` | Да |
| `store_id` | `string` | Да |
| `store_name` | `string` | Да |
| `total_cost` | `number` | Да |
| `total_cost_label` | `string` | Да |
| `total_impressions` | `number` | Да |
| `total_impressions_label` | `string` | Да |
| `total_paid` | `number` | Да |
| `total_paid_label` | `string` | Да |

### View partner_devices

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `battery_label` | `string` | Да |
| `battery_level` | `number` | Да |
| `cart_number` | `string` | Да |
| `id` | `string` | Да |
| `last_seen_label` | `string` | Да |
| `status` | `cart_status` | Да |
| `status_label` | `string` | Да |
| `store_name` | `string` | Да |
| `summary_value_label` | `string` | Да |

### View partner_finance_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `accrued_amount` | `number` | Да |
| `accrued_amount_label` | `string` | Да |
| `apex_share` | `number` | Да |
| `apex_share_label` | `string` | Да |
| `last_payout_date` | `string` | Да |
| `paid_amount` | `number` | Да |
| `paid_amount_label` | `string` | Да |
| `paid_invoices_count` | `number` | Да |
| `partner_share` | `number` | Да |
| `partner_share_label` | `string` | Да |
| `payout_summary_label` | `string` | Да |
| `remaining_amount` | `number` | Да |
| `remaining_amount_label` | `string` | Да |
| `total_ad_revenue` | `number` | Да |
| `total_ad_revenue_label` | `string` | Да |
| `total_campaign_cost` | `number` | Да |
| `total_campaign_cost_label` | `string` | Да |
| `total_expected` | `number` | Да |
| `total_expected_label` | `string` | Да |
| `total_invoiced` | `number` | Да |
| `total_invoiced_label` | `string` | Да |
| `total_paid` | `number` | Да |
| `total_paid_label` | `string` | Да |
| `unpaid_invoices_count` | `number` | Да |

### View partner_finance_stats_by_store

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `accrued_amount` | `number` | Да |
| `accrued_amount_label` | `string` | Да |
| `apex_share` | `number` | Да |
| `apex_share_label` | `string` | Да |
| `last_payout_date` | `string` | Да |
| `paid_amount` | `number` | Да |
| `paid_amount_label` | `string` | Да |
| `paid_invoices_count` | `number` | Да |
| `partner_share` | `number` | Да |
| `partner_share_label` | `string` | Да |
| `payout_summary_label` | `string` | Да |
| `remaining_amount` | `number` | Да |
| `remaining_amount_label` | `string` | Да |
| `store_id` | `string` | Да |
| `store_name` | `string` | Да |
| `total_ad_revenue` | `number` | Да |
| `total_ad_revenue_label` | `string` | Да |
| `total_campaign_cost` | `number` | Да |
| `total_campaign_cost_label` | `string` | Да |
| `total_expected` | `number` | Да |
| `total_expected_label` | `string` | Да |
| `total_invoiced` | `number` | Да |
| `total_invoiced_label` | `string` | Да |
| `total_paid` | `number` | Да |
| `total_paid_label` | `string` | Да |
| `unpaid_invoices_count` | `number` | Да |

### View partner_statistics_summary

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `active_zones` | `number` | Да |
| `active_zones_label` | `string` | Да |
| `completed_plays` | `number` | Да |
| `completed_plays_label` | `string` | Да |
| `plays_today` | `number` | Да |
| `plays_today_label` | `string` | Да |
| `total_plays` | `number` | Да |
| `total_plays_label` | `string` | Да |

### View partner_store_playback_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays` | `number` | Да |
| `plays_label` | `string` | Да |
| `share_progress` | `number` | Да |
| `store_id` | `string` | Да |
| `store_name` | `string` | Да |

### View partner_stores

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `city` | `string` | Да |
| `id` | `string` | Да |
| `name` | `string` | Да |

### View partner_team_members

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `created_at` | `string` | Да |
| `email` | `string` | Да |
| `finance_visible` | `boolean` | Да |
| `full_name` | `string` | Да |
| `id` | `string` | Да |
| `is_active` | `boolean` | Да |
| `partner_role` | `string` | Да |
| `partner_role_label_ru` | `string` | Да |
| `status_label_ru` | `string` | Да |

### View store_cart_connectivity

**Используется текущим фронтендом.**

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `offline_carts` | `number` | Да |
| `online_carts` | `number` | Да |
| `store_id` | `string` | Да |
| `total_carts` | `number` | Да |

### View store_cart_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `cart_id` | `string` | Да |
| `plays_month` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `store_id` | `string` | Да |
| `total_plays` | `number` | Да |

### View store_stats

**Используется текущим фронтендом.**

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays_month` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `store_id` | `string` | Да |
| `total_plays` | `number` | Да |

### View user_ad_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `plays_month` | `number` | Да |
| `plays_today` | `number` | Да |
| `plays_week` | `number` | Да |
| `total_plays` | `number` | Да |
| `user_id` | `string` | Да |

### View zone_stats

Присутствует в контракте; прямого запроса из текущих API разделов нет.

| Поле | TypeScript-тип API | Nullable |
| --- | --- | --- |
| `pct_share` | `number` | Да |
| `plays_last_24h` | `number` | Да |
| `store_id` | `string` | Да |
| `zone_id` | `string` | Да |
| `zone_name` | `string` | Да |
| `zone_rank` | `number` | Да |

## Прикладные и служебные RPC

Это сигнатуры из generated types. `never` в `Args` означает отсутствие параметров, `undefined` в `Returns` — отсутствие полезного возвращаемого значения для клиента. `string` не документирует формат результата без тела функции.

Текущий frontend API вызывает шесть RPC. У остальных наличие сигнатуры не означает реализованный UI или публичные права исполнения. Полного исходного SQL функций кампаний в этом репозитории нет.

### RPC _campaign_err

Внутренняя вспомогательная функция кампаний по назначению имени; не вызывать из UI.

```typescript
Args: { p_code: string; p_detail: string; p_field: string }
Returns: undefined
```

### RPC _campaign_insert_links

Внутренняя вспомогательная функция кампаний по назначению имени; не вызывать из UI.

```typescript
Args: { n: Json; p_ad: string }
Returns: undefined
```

### RPC _campaign_media_path

Внутренняя вспомогательная функция кампаний по назначению имени; не вызывать из UI.

```typescript
Args: { p_uid: string; p_url: string }
Returns: string
```

### RPC _campaign_replace_links

Внутренняя вспомогательная функция кампаний по назначению имени; не вызывать из UI.

```typescript
Args: { n: Json; p_ad: string }
Returns: undefined
```

### RPC _campaign_user_email

Внутренняя вспомогательная функция кампаний по назначению имени; не вызывать из UI.

```typescript
Args: { p_uid: string }
Returns: string
```

### RPC _campaign_validate

Внутренняя вспомогательная функция кампаний по назначению имени; не вызывать из UI.

```typescript
Args: { p: Json; p_require_request?: boolean; p_uid: string }
Returns: Json
```

### RPC admin_campaign_media_orphans

Административная операция; рекламодательский UI её не вызывает.

```typescript
Args: never
Returns: {
  created_at: string
  name: string
  size_bytes: number
}[]
```

### RPC admin_mark_invoice_paid

Административная операция; рекламодательский UI её не вызывает.

```typescript
Args: { p_invoice_id: string }
Returns: string
```

### RPC admin_moderate_campaign

Административная операция; рекламодательский UI её не вызывает.

```typescript
Args: {
  p_approve: boolean
  p_comment?: string
  p_id: string
  p_reasons?: string[]
}
Returns: string
```

### RPC catalog_stores

**Вызывается текущим фронтендом.**

```typescript
Args: never
Returns: {
  active_campaigns: number
  address: string
  cart_count: number
  city: string
  id: string
  name: string
  zone_count: number
}[]
```

### RPC catalog_zones

**Вызывается текущим фронтендом.**

```typescript
Args: { p_store_ids: string[] }
Returns: {
  description: string
  icon_emoji: string
  id: string
  name: string
  other_brands: number
  store_id: string
}[]
```

### RPC check_phone_exists

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_phone: string }
Returns: boolean
```

### RPC complete_ad_playback

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_duration_seconds: number; p_session_id: string }
Returns: string
```

### RPC complete_contact_registration

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_bin?: string; p_company_name?: string; p_full_name: string }
Returns: undefined
```

### RPC complete_phone_registration

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_bin?: string; p_company_name?: string; p_full_name: string }
Returns: undefined
```

### RPC complete_signup_profile

**Вызывается текущим фронтендом.**

```typescript
Args: { p_bin: string; p_company_name: string; p_full_name: string }
Returns: undefined
```

### RPC current_finance_visible

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: never
Returns: boolean
```

### RPC current_partner_id

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: never
Returns: string
```

### RPC current_user_role

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: never
Returns: string
```

### RPC edit_campaign

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p: Json; p_id: string; p_tariff_version?: number }
Returns: string
```

### RPC extend_campaign

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_amount: number; p_id: string; p_tariff_version: number }
Returns: string
```

### RPC get_email_by_phone

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_phone: string }
Returns: string
```

### RPC handle_beacon_detected

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: {
  p_cart_id: string
  p_device_identifier: string
  p_duration_seconds?: number
}
Returns: string
```

### RPC is_apex_admin

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: never
Returns: boolean
```

### RPC owns_ad

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_ad_id: string }
Returns: boolean
```

### RPC partner_store_ids

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: never
Returns: string[]
```

### RPC prepare_ad_playback

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_cart_id: string; p_device_identifier: string }
Returns: Json
```

### RPC request_campaign_topup

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_amount: number; p_id: string }
Returns: string
```

### RPC resubmit_campaign

**Вызывается текущим фронтендом.**

```typescript
Args: { p: Json; p_id: string }
Returns: string
```

### RPC select_ad_for_zone

Присутствует в БД-контракте; текущий frontend API её не вызывает.

```typescript
Args: { p_store_id: string; p_zone_id: string }
Returns: string
```

### RPC submit_campaign

**Вызывается текущим фронтендом.**

```typescript
Args: { p: Json }
Returns: string
```

### RPC submit_corporate_request

**Вызывается текущим фронтендом.**

```typescript
Args: { p: Json }
Returns: string
```

## Схемы вне public

- `auth`: пользователи, identities, сессии и подтверждения, управляемые Supabase Auth. Код использует `auth.uid()` и объект Auth user; таблицы этой схемы не описаны в текущем `Database.public`.
- `storage`: метаданные buckets/objects. Фронтенд использует bucket `campaign-media`; SQL-политики Storage не сохранены в имеющейся миграции профиля.
- Служебные схемы Supabase, расширения и расписание синхронизации требуют отдельного инвентаря; public generated types их не покрывают.

## Как уточнить реальную SQL-структуру

При согласованном доступе открыть SQL Editor именно проекта Apex. Следующие запросы читают только метаданные; они не восстанавливают БД и не изменяют её.

```sql
-- SQL-типы, nullable и defaults.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- PK, UNIQUE, FK, CHECK, включая действия ON DELETE.
select c.relname as table_name, con.conname, con.contype,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

-- Включение RLS и принудительный режим.
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

-- Политики (права GRANT проверяются отдельно).
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

-- Пример определения view.
select pg_get_viewdef('public.my_campaigns_stats'::regclass, true);
```

Для полного переноса также нужны grants, индексы, триггеры, функции, extensions, Auth-конфигурация, Storage policies и серверные задания. После согласованных изменений БД обновить generated types штатным генератором Supabase и пересобрать этот справочник. Типы вручную не исправлять.

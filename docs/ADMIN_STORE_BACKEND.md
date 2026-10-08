# Бэкенд магазина: фактический контракт

Документ описывает то, что **реально развёрнуто** в базе (проверено чтением метаданных 07.10.2026). Где реализация отличается от первоначального плана — это указано явно.

## 1. Окружение

| Параметр | Значение |
|---|---|
| Окружение | **production** (единственная ветка `main`, отдельных веток Supabase нет) |
| Project ref | `eveylcsziemhqouazebu` (основной проект Apex) |
| Миграции в истории | `20261007153429_store_onboarding_tables`, `20261007153522_store_onboarding_functions` — применены 07.10.2026 |
| Часть 3 | `admin_replace_store_zoning` и REVOKE применены 07.10.2026 вручную через SQL Editor. **В `supabase_migrations.schema_migrations` их нет** — файл `20261007160000_store_onboarding_zoning_and_grants.sql` нужно держать в репозитории, чтобы история совпадала |
| Применено к Apex | да |
| Cart (`yasoadhyjmstegjhcdzi`) | не изменялся; проверено: функций и таблиц заявок там нет |
| Тестовое окружение | **нет**. Бэкенд существует только в production |
| Владелец Apex | настроен: в `apex_store_owners` одна запись |
| Тестовые учётные записи | отдельных тестовых админа, пользователя и владельца **нет**; есть только реальные аккаунты |

**Что уже проверено:**
- полный сценарий (создание → план → зоны → отправка → отказ админу → одобрение владельцем → повтор без дубля → сбой посреди публикации без остатков → отклонение и повторная отправка → RLS всех ролей) на локальном PostgreSQL 16 с копией схемы;
- в production — тот же сценарий, включая одобрение владельцем, **внутри транзакции с откатом**. Записей не осталось, заявок в базе 0.

**Что нельзя делать в production:**
- создавать тестовые заявки и тем более одобрять их: одобрение создаёт настоящий магазин и зоны в `stores` / `zones`, и они сразу видны в админке;
- удалять или переписывать опубликованные магазины, зоны и планы.

Production **не является** безопасным местом для тестовой публикации магазина. Для ручного тестирования фронта нужен staging (отдельный проект или ветка) или проверка вызовов до шага «отправить владельцу» с последующим удалением черновика администратором базы.

## 2. Общие правила вызова

- Все функции — `supabase.rpc('<имя>', { ...args })`. Имена аргументов с префиксом `p_`.
- Все функции: `SECURITY DEFINER`, `search_path = public, pg_temp`, `EXECUTE` только у `authenticated` (у `anon` и `public` отозван). Пользователь определяется по `auth.uid()`, роль и user_id в аргументах не принимаются.
- Личные данные (email, телефоны, UUID авторов) функции не возвращают. Вместо автора — флаг `is_mine`.
- Типы `bigint` в TypeScript приходят как `number`.

### Формат ошибок

SQLSTATE `P0001`. В supabase-js:

```ts
error.code    // 'P0001'
error.message // стабильный код, например 'revision_conflict'
error.hint    // поле ('name', 'plan', 'zones.color' …) или ''
error.details // текст для показа пользователю (по-русски)
```

Ошибки прав доступа самой базы (например, вызов без входа после отзыва прав) приходят с другим `code` (`42501`) — их стоит показывать как «нет доступа».

| Код | Когда |
|---|---|
| `not_authenticated` | нет входа |
| `forbidden` | не админ / не автор заявки / не владелец; `request_key` уже занят другим пользователем |
| `not_found` | заявки или опубликованного плана нет |
| `invalid_status` | действие недопустимо в текущем статусе |
| `revision_conflict` | `p_expected_revision` не совпал с текущей |
| `invalid_store` | name / city / address / timezone / partner_id / комментарий отклонения / пустой `request_key` |
| `invalid_plan` | план не прошёл проверку или не сохранён |
| `plan_too_large` | JSON плана больше 512 КБ |
| `too_many_elements` | больше 1000 элементов или 2000 декораций |
| `duplicate_element` | повтор `id` элемента плана |
| `invalid_zones` | ошибки в зонах |
| `invalid_assignments` | ошибки в назначениях |
| `owner_not_configured` | таблица владельцев пуста |
| `already_published` | магазин по заявке уже существует (без корректной связи) |

## 3. request_key

| Вопрос | Ответ |
|---|---|
| Кто генерирует | фронтенд, один раз на попытку создания (`crypto.randomUUID()`) |
| Тип | `uuid` (в TS — `string`) |
| Повтор после сетевой ошибки | **да, нужно повторять с тем же ключом** |
| Область уникальности | **вся таблица** (глобально), а не «в пределах админа» |
| Повторный вызов тем же админом | возвращает id уже созданной заявки; данные не меняются, аудит не пишется повторно |
| Тот же ключ другим пользователем | `forbidden` (hint `request_key`) |
| Две заявки одним ключом | невозможно (UNIQUE + `on conflict do nothing`) |
| Хранится после создания | да, `store_onboarding_requests.request_key`, но функциями чтения не возвращается |

## 4. revision

| Вопрос | Ответ |
|---|---|
| Начальное значение | `1` |
| Увеличивают на 1 | `admin_update_store_request`, `admin_save_store_plan`, `admin_replace_store_zoning`, `admin_submit_store_request`, `owner_approve_store_request`, `owner_reject_store_request` |
| Не увеличивают | `admin_create_store_request`, все функции чтения |
| Передаётся ли ожидаемая | да, `p_expected_revision` во всех мутациях, кроме создания |
| Тип | `bigint` (в TS — `number`) |
| Что возвращается | мутации черновика и отклонение — **новая** revision; одобрение — id магазина |
| Код конфликта | `revision_conflict` (hint `revision`) |
| Автоповтор мутации | только создание (тем же ключом) и одобрение. Остальные — не повторять вслепую |

**Неизвестный результат** (таймаут, обрыв): вызвать `get_store_request(p_id)` и сравнить `request.revision`:
- `revision === expected` → изменение не применилось, можно повторить;
- `revision === expected + 1` и данные совпадают с отправленными → изменение применилось, взять новую revision;
- иначе → заявку изменили в другом месте, перечитать и показать пользователю.

## 5. Статусы

Только значения из CHECK-ограничения `store_onboarding_requests_status_check`:

| Статус | Данные магазина | План | Зоны | Отправка | Решение владельца | Магазин создан |
|---|---|---|---|---|---|---|
| `inactive` | да | да | да | да | нет | нет |
| `pending_owner_approval` | нет | нет | нет | нет | **да** | нет |
| `approved` | нет | нет | нет | нет | повтор одобрения возвращает тот же магазин; отклонить нельзя | **да** |
| `rejected` | да | да | да | да (повторно) | нет | нет |

Изменять черновик может **только автор** заявки (и он должен оставаться админом). Другие админы и владелец его только читают.

## 6. Ограничения данных магазина

Проверка — `_store_validate_fields`. Все строки обрезаются по краям (`btrim`) перед проверкой и сохранением.

| Поле | Nullable в БД | При создании/изменении | При отправке и одобрении | Длина (после trim) | Ошибка (hint) |
|---|---|---|---|---|---|
| `name` | да | **обязательно** | обязательно | 2–120 | `invalid_store` (`name`) |
| `city` | да | можно `null`/пусто (сохраняется `null`) | обязательно | ≤ 80 | `invalid_store` (`city`) |
| `address` | да | можно `null`/пусто | обязательно | ≤ 200 | `invalid_store` (`address`) |
| `timezone` | нет, по умолчанию `Asia/Almaty` | необязательно; `null` → `Asia/Almaty` | — | имя из `pg_timezone_names` (IANA, например `Asia/Almaty`, `Asia/Aqtobe`, `UTC`) | `invalid_store` (`timezone`) |
| `partner_id` | да | необязательно | — | должен существовать в `public.partners` | `invalid_store` (`partner_id`) |

`admin_update_store_request` перезаписывает **все** поля сразу: передавайте полный набор, иначе незаданные `p_timezone`/`p_partner_id` станут значениями по умолчанию (`Asia/Almaty` / `null`).

## 7. Источник партнёров

| Вопрос | Факт |
|---|---|
| Таблица | `public.partners` (`id`, `name`, `legal_name`, `contract_type`, `created_at`) |
| View / RPC для выбора | **нет** |
| RLS | включён, **политик нет** → из браузера (anon и authenticated, включая админа) таблица читается как пустая |
| Grants | у `anon` и `authenticated` есть табличные права, но без политик они ничего не дают |
| Строк сейчас | 0 |
| Пагинация | сейчас не нужна (0 строк); при появлении данных — достаточно клиентской |
| Если партнёр не выбран | передавать `p_partner_id: null` — это допустимо |

**Блокер:** выбрать партнёра в интерфейсе сейчас нельзя — нет ни данных, ни способа их прочитать. Нужен отдельный бэкенд (политика чтения для админа или RPC). До этого поле партнёра скрыть и отправлять `null`.

## 8. План (`plan_data`)

Проверка — `_store_plan_validate`, выполняется при сохранении, отправке и одобрении.

| Правило | Значение | Ошибка |
|---|---|---|
| Корень | JSON-объект | `invalid_plan` |
| Размер | ≤ 524 288 байт (512 КБ) текста JSON | `plan_too_large` |
| `version` | число, ровно `1` | `invalid_plan` (`version`) |
| `width`, `height` | числа, `0 < x ≤ 100000` | `invalid_plan` (`width`) |
| `elements` | массив, 1–1000 элементов | `invalid_plan` / `too_many_elements` (`elements`) |
| `decorations` | массив, ≤ 2000, содержимое не проверяется (кроме запрета HTML/JS) | `invalid_plan` / `too_many_elements` |
| `metadata` | объект, содержимое не проверяется (кроме запрета HTML/JS) | `invalid_plan` (`metadata`) |
| HTML / JS | ни одна строка плана (на любой глубине) не содержит `<тег`, `javascript:`, `vbscript:`, `data:text/html`, `on…=` | `invalid_plan` (`plan`) |

Элемент (`elements[i]`):

| Поле | Тип | Правило | Ошибка (hint) |
|---|---|---|---|
| `id` | string | `^[A-Za-z0-9_.:-]{1,64}$`, уникален в плане | `invalid_plan` (`elements.id`) / `duplicate_element` |
| `kind` | string | `shelf`, `rack`, `wall_shelf`, `island`, `fridge`, `freezer`, `display`, `counter`, `checkout`, `pallet`, `section`, `promo`, `entrance`, `other` | `invalid_plan` (`elements.kind`) |
| `x`, `y` | number | `≥ 0` | `invalid_plan` (`elements.x`) |
| `width`, `height` | number | `> 0` | `invalid_plan` (`elements.width`) |
| граница | — | `x + width ≤ plan.width`, `y + height ≤ plan.height` | `invalid_plan` (`elements.x`) |
| `label` | string | обязательно, ≤ 120 символов (может быть пустой строкой) | `invalid_plan` (`elements.label`) |
| `category` | string \| null | необязательно, ≤ 60 символов | `invalid_plan` (`elements.category`) |

`source_file_name` — необязательно, ≤ 255 символов (`invalid_plan`, hint `source_file_name`).

Синтетический пример:

```json
{
  "version": 1,
  "width": 1200,
  "height": 800,
  "elements": [
    { "id": "A-1", "kind": "shelf",    "x": 40,  "y": 40, "width": 200, "height": 60,  "label": "Стеллаж A-1", "category": "grocery" },
    { "id": "F-1", "kind": "fridge",   "x": 300, "y": 40, "width": 120, "height": 60,  "label": "Холодильник 1" },
    { "id": "C-1", "kind": "checkout", "x": 980, "y": 680, "width": 160, "height": 80, "label": "Касса" }
  ],
  "decorations": [ { "type": "wall", "points": [0, 0, 1200, 0] } ],
  "metadata": { "units": "cm" }
}
```

## 9. Зонирование

`admin_replace_store_zoning` **атомарно заменяет** все зоны и назначения черновика: старые удаляются, новые создаются в одной транзакции (при любой ошибке не меняется ничего). Нужен уже сохранённый план (`invalid_plan` иначе).

```ts
type ZoneInput = {
  client_id: string      // ^[A-Za-z0-9_.:-]{1,64}$, уникален в запросе
  name: string           // после trim 1–80 символов, уникально без учёта регистра
  color: string          // '#RRGGBB'; сохраняется в ВЕРХНЕМ регистре
  description?: string | null // ≤ 300
  sort_order?: number | null  // по умолчанию — позиция в массиве (0, 1, 2 …)
}
type AssignmentInput = {
  element_id: string     // id элемента из сохранённого плана
  zone_client_id: string // client_id зоны из этого же запроса
}
```

| Правило | Ошибка (hint) |
|---|---|
| `p_zones` — массив из 1–200 зон | `invalid_zones` (`zones`) |
| дубль `client_id` / неверный формат | `invalid_zones` (`zones.client_id`) |
| пустое / длинное / повторное название | `invalid_zones` (`zones.name`) |
| цвет не `#RRGGBB` | `invalid_zones` (`zones.color`) |
| описание не строка или > 300 | `invalid_zones` (`zones.description`) |
| `sort_order` не число | `invalid_zones` (`zones.sort_order`) |
| `p_assignments` не массив | `invalid_assignments` (`assignments`) |
| `element_id` нет в плане | `invalid_assignments` (`assignments.element_id`) |
| один `element_id` в двух назначениях | `invalid_assignments` (`assignments.element_id`) |
| `zone_client_id` не из этого запроса | `invalid_assignments` (`assignments.zone_client_id`) |
| у зоны нет ни одной секции | `invalid_zones` (`zones`) |

- **Элементы без зоны допускаются** (например, касса или вход).
- **Каждая зона обязана иметь хотя бы одну секцию.**
- После замены у зон новые UUID. В ответе чтения (`get_store_request`) назначения ссылаются на `zone_id` (UUID зоны черновика); чтобы отправить разметку снова, сопоставьте `zone_id` → `client_id` по массиву `zones`.
- Если позже сохранить план без какой-то секции, назначения на неё останутся, а отправка вернёт `invalid_assignments` — разметку нужно пересохранить.

Синтетический пример (к плану из раздела 8):

```json
{
  "p_zones": [
    { "client_id": "grocery", "name": "Бакалея", "color": "#22AA55" },
    { "client_id": "cold",    "name": "Холод",   "color": "#3366CC", "description": "Холодильники" }
  ],
  "p_assignments": [
    { "element_id": "A-1", "zone_client_id": "grocery" },
    { "element_id": "F-1", "zone_client_id": "cold" }
  ]
}
```

## 10. Владелец

- Сервер считает владельцем пользователя, чей `auth.uid()` есть в `public.apex_store_owners` (`is_apex_store_owner()`).
- Сейчас настроен **один** владелец. Добавляется только SQL-запросом в Dashboard; из браузера таблицу изменить нельзя.
- Если владельцев нет: одобрение, отклонение и очередь владельца возвращают `owner_not_configured`.
- Обычный администратор одобрить или отклонить заявку **не может** (`forbidden`), даже если он автор.
- Решения пишутся в `public.audit_log`: `store_request.approved` (entity_type `store`, entity_id = id магазина) и `store_request.rejected`. Также пишутся `store_request.created` и `store_request.submitted`.

## 11. Операции

Кто может вызывать: **А** — админ (`users.role = 'admin'`), **Ав** — автор заявки (админ), **В** — владелец Apex.

### 11.1 Создание заявки — `admin_create_store_request`

```sql
admin_create_store_request(p_request_key uuid, p_name text, p_city text default null,
  p_address text default null, p_timezone text default 'Asia/Almaty', p_partner_id uuid default null) returns uuid
```

```ts
type Args = { p_request_key: string; p_name: string; p_city?: string | null; p_address?: string | null;
              p_timezone?: string | null; p_partner_id?: string | null }
// Returns: string (uuid заявки)
```

- Кто: **А**. Статус результата: `inactive`, revision `1`. Магазин в `stores` не создаётся.
- Идемпотентность: по `request_key` (см. раздел 3). Повторный вызов тем же админом возвращает тот же id, даже если имя изменилось.
- Неизвестный результат: повторить с тем же ключом.
- Ошибки: `not_authenticated`, `forbidden`, `invalid_store`.
- Пример ответа: `"00000000-0000-4000-8000-000000000001"`.

### 11.2 Чтение одной заявки — `get_store_request`

```sql
get_store_request(p_id uuid) returns jsonb
```

- Кто: **А**, **В**. Любой статус. Ошибки: `not_authenticated`, `forbidden`, `not_found`.
- Это же — чтение сохранённого плана (`plan`) и зон с назначениями (`zones`, `assignments`) черновика.

```json
{
  "request": {
    "id": "00000000-0000-4000-8000-000000000001", "status": "inactive", "revision": 3,
    "name": "Тестовый магазин", "city": "Город", "address": "ул. Примерная, 1", "timezone": "Asia/Almaty",
    "partner_id": null, "proposed_store_id": "00000000-0000-4000-8000-0000000000aa", "published_store_id": null,
    "submitted_at": null, "reviewed_at": null, "review_comment": null,
    "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:05:00+00:00", "is_mine": true
  },
  "plan": { "format_version": 1, "width": 1200, "height": 800, "source_file_name": "plan.json",
            "plan_data": { "version": 1, "...": "..." }, "updated_at": "2026-01-01T00:03:00+00:00" },
  "zones": [ { "id": "00000000-0000-4000-8000-0000000000z1", "client_id": "grocery", "name": "Бакалея",
               "description": null, "color": "#22AA55", "sort_order": 0 } ],
  "assignments": [ { "element_id": "A-1", "zone_id": "00000000-0000-4000-8000-0000000000z1" } ]
}
```

`plan` = `null`, если план ещё не сохранён; `zones` и `assignments` — пустые массивы, если разметки нет.

### 11.3 Список заявок — `admin_list_store_requests`

```sql
admin_list_store_requests(p_status text default null) returns table(id uuid, status text, revision bigint,
  name text, city text, address text, timezone text, partner_id uuid, proposed_store_id uuid,
  published_store_id uuid, submitted_at timestamptz, reviewed_at timestamptz, review_comment text,
  created_at timestamptz, updated_at timestamptz, zone_count int, has_plan boolean, is_mine boolean)
```

- Кто: **А**, **В**. Все заявки (не только свои), сортировка `updated_at desc`. Фильтр `p_status` — точное значение статуса.
- Пагинации на сервере нет; можно `.range()` в supabase-js.
- Внимание: сгенерированные типы помечают поля `name`, `city`, `address`, `partner_id`, `published_store_id`, `submitted_at`, `reviewed_at`, `review_comment` как `string`, но **в рантайме они могут быть `null`**.
- Ошибки: `not_authenticated`, `forbidden`.

### 11.4 Изменение данных магазина — `admin_update_store_request`

```sql
admin_update_store_request(p_id uuid, p_expected_revision bigint, p_name text, p_city text, p_address text,
  p_timezone text default 'Asia/Almaty', p_partner_id uuid default null) returns bigint
```

```ts
type Args = { p_id: string; p_expected_revision: number; p_name: string; p_city: string | null;
              p_address: string | null; p_timezone?: string | null; p_partner_id?: string | null }
// Returns: number (новая revision)
```

- Кто: **Ав**. Статусы: `inactive`, `rejected`; статус не меняется; revision +1.
- Не идемпотентна: повтор с той же ревизией после успеха → `revision_conflict`.
- Ошибки: `not_authenticated`, `forbidden`, `not_found`, `invalid_status`, `revision_conflict`, `invalid_store`.
- Пример ответа: `4`.

### 11.5 Сохранение или замена плана — `admin_save_store_plan`

```sql
admin_save_store_plan(p_id uuid, p_expected_revision bigint, p_plan jsonb, p_source_file_name text default null) returns bigint
```

```ts
type Args = { p_id: string; p_expected_revision: number; p_plan: Json; p_source_file_name?: string | null }
```

- Кто: **Ав**. Статусы: `inactive`, `rejected`. Upsert (одна запись плана на заявку); revision +1. Опубликованный магазин не меняется.
- Чтение сохранённого плана — `get_store_request(p_id).plan`.
- Ошибки: общие + `invalid_plan`, `plan_too_large`, `too_many_elements`, `duplicate_element`.
- Пример ответа: `5`.

### 11.6 Сохранение или замена зонирования — `admin_replace_store_zoning`

```sql
admin_replace_store_zoning(p_id uuid, p_expected_revision bigint, p_zones jsonb, p_assignments jsonb) returns bigint
```

- Кто: **Ав**. Статусы: `inactive`, `rejected`. Атомарная замена; revision +1. Формат — раздел 9.
- Чтение зон и назначений — `get_store_request(p_id).zones / .assignments`.
- Ошибки: общие + `invalid_plan` (нет плана), `invalid_zones`, `invalid_assignments`.
- Пример ответа: `6`.

### 11.7 Отправка владельцу — `admin_submit_store_request`

```sql
admin_submit_store_request(p_id uuid, p_expected_revision bigint) returns bigint
```

- Кто: **Ав**. Статусы: `inactive`, `rejected` → `pending_owner_approval`; ставит `submitted_at`; revision +1; аудит `store_request.submitted`.
- Проверяет: name, city, address обязательны; план есть и валиден; есть зоны; у каждой зоны есть секция; все назначения ссылаются на элементы плана.
- Неизвестный результат: перечитать; `status = 'pending_owner_approval'` и `revision = expected + 1` → отправлено.
- Ошибки: общие + `invalid_store`, `invalid_plan`, `invalid_zones`, `invalid_assignments`.
- Пример ответа: `7`.

### 11.8 Очередь владельца — `owner_list_pending_store_requests`

```sql
owner_list_pending_store_requests() returns table(<те же колонки, что в 11.3>)
```

- Кто: **В**. Только `pending_owner_approval`, сортировка по `submitted_at`.
- Ошибки: `not_authenticated`, `owner_not_configured`, `forbidden`.

### 11.9 Одобрение владельцем — `owner_approve_store_request`

```sql
owner_approve_store_request(p_id uuid, p_expected_revision bigint) returns uuid
```

- Кто: **В**. Статус: `pending_owner_approval` → `approved`; revision +1; `reviewed_by`, `reviewed_at`, `published_store_id`.
- Одной транзакцией создаёт `stores` (id = `proposed_store_id`), `zones`, `store_plans`, `store_plan_zone_styles`, `store_plan_zone_assignments` и аудит. Ошибка на любом шаге откатывает всё.
- **Идемпотентна**: если заявка уже `approved` и магазин с этой связью существует, возвращает тот же id магазина. Ревизия в этом случае **не проверяется**, поэтому безопасно повторять после сетевой ошибки.
- Ошибки: `not_authenticated`, `owner_not_configured`, `forbidden`, `not_found`, `invalid_status`, `revision_conflict`, `already_published`, а также ошибки повторной проверки (`invalid_store`, `invalid_plan`, `invalid_zones`, `invalid_assignments`).
- Пример ответа: `"00000000-0000-4000-8000-0000000000aa"`.

### 11.10 Отклонение владельцем — `owner_reject_store_request`

```sql
owner_reject_store_request(p_id uuid, p_expected_revision bigint, p_comment text) returns bigint
```

- Кто: **В**. Статус: `pending_owner_approval` → `rejected`; комментарий обязателен (после trim 3–1000 символов, иначе `invalid_store`, hint `comment`); revision +1; аудит.
- Не идемпотентна: повтор после успеха → `invalid_status`. Неизвестный результат: перечитать, `status = 'rejected'` → отклонено.
- Пример ответа: `8`.

### 11.11 Опубликованный план — `get_store_plan`

```sql
get_store_plan(p_store_id uuid) returns jsonb
```

- Кто: **А**, **В**. Ошибки: `not_authenticated`, `forbidden`, `not_found` (у магазина нет плана; у старых магазинов, например Carefood, плана нет).

```json
{
  "plan": { "id": "00000000-0000-4000-8000-0000000000p1", "store_id": "00000000-0000-4000-8000-0000000000aa",
            "onboarding_request_id": "00000000-0000-4000-8000-000000000001", "format_version": 1,
            "width": 1200, "height": 800, "source_file_name": "plan.json", "plan_data": { "version": 1, "...": "..." },
            "created_at": "2026-01-01T00:10:00+00:00" },
  "zones": [ { "zone_id": "00000000-0000-4000-8000-0000000000z1", "name": "Бакалея", "color": "#22AA55", "sort_order": 0 } ],
  "assignments": [ { "element_id": "A-1", "zone_id": "00000000-0000-4000-8000-0000000000z1" } ]
}
```

### 11.12 Проверка владельца — `is_apex_store_owner`

`is_apex_store_owner() returns boolean` — `true`, если текущий пользователь владелец. Для показа/скрытия кнопок «Одобрить / Отклонить». Кто: любой вошедший.

## 12. Живая схема (проверено чтением 07.10.2026)

- **Таблицы:** `apex_store_owners` (3 столбца), `store_onboarding_requests` (18), `store_onboarding_plans` (8), `store_onboarding_zones` (9), `store_onboarding_assignments` (4), `store_plans` (12), `store_plan_zone_styles` (4), `store_plan_zone_assignments` (3).
- **RLS** включён на всех восьми. Политики только SELECT для `authenticated`: заявки — админ, владелец или автор; планы/зоны/назначения черновика — через `_can_read_store_request`; опубликованные планы — админ или владелец; `apex_store_owners` — только своя строка.
- **Grants:** у `anon` прав на новые таблицы нет; у `authenticated` — только SELECT.
- **Ограничения:** CHECK статуса и revision ≥ 1; UNIQUE `request_key`, `proposed_store_id`, `(request_id, client_id)`, `(request_id, lower(btrim(name)))`, `(request_id, id)`; CHECK цвета и непустого названия; составной FK назначений на зону той же заявки; UNIQUE `store_plans.store_id` и `onboarding_request_id`.
- **Индексы:** по статусу и `updated_at`, по автору, по зоне назначения, по `zones.onboarding_request_id`.
- **Новые столбцы:** `stores.onboarding_request_id` (FK, UNIQUE), `stores.approved_at`, `stores.approved_by` (FK `auth.users`), `zones.onboarding_request_id` (FK). У существующих строк — `NULL`.
- **Функции:** все 12 публичных и 9 служебных — `SECURITY DEFINER` или invoker как задумано, `search_path = public, pg_temp`. `EXECUTE`: публичные — только `authenticated`; служебные `_store_*` — никому из клиентских ролей; `_can_read_store_request` — `authenticated` (нужна политикам).

## 13. Расхождения

| Объект | Был запланирован | Есть в живой базе | Есть в database.types.ts | Готов для фронтенда |
|---|---|---|---|---|
| 8 таблиц заявок/планов/зон/владельцев | да | да | да | да (только чтение) |
| столбцы `stores.*`, `zones.onboarding_request_id` | да | да | да | да |
| `admin_create_store_request` | да | да | да | да |
| `admin_update_store_request` | да | да | да | да (передавать все поля) |
| `admin_save_store_plan` | да | да | да | да |
| `admin_replace_store_zoning` | да | да (применена вручную, нет в истории миграций) | да | да |
| `admin_submit_store_request` | да | да | да | да |
| `owner_approve_store_request` | да | да | да | да |
| `owner_reject_store_request` | да | да | да | да |
| `admin_list_store_requests` | да | да | да | да (nullable-поля типизированы как `string`) |
| `owner_list_pending_store_requests` | да | да | да | да |
| `get_store_request` | да | да | да (`Json`) | да (форма — раздел 11.2) |
| `get_store_plan` | да | да | да (`Json`) | да (форма — раздел 11.11) |
| `is_apex_store_owner` | да | да | да | да |
| Источник партнёров для выбора | да | **нет** (RLS без политик, 0 строк) | таблица есть | **нет — блокер выбора партнёра** |
| Служебные `_store_*` | приватные | да | **присутствуют в типах** | не вызывать: вернут ошибку прав |
| Тестовое окружение | да | **нет** | — | **блокер ручного тестирования одобрения** |
| Запись части 3 в истории миграций | да | **нет** | — | не влияет на работу; добавить файл в репозиторий |

## 14. Откат (не выполнялся)

См. файлы миграций. Порядок: удалить новые функции → таблицы опубликованных планов → FK новых столбцов → таблицы черновиков → `apex_store_owners`. Магазины, опубликованные через заявки, откат не удаляет — их нужно оценить отдельно (`stores where onboarding_request_id is not null`).

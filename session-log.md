# Session log

История фич проекта, новые записи сверху. Здесь хранятся итоги, решения и подробности. В `CLAUDE.md` остаются только архитектура и правила.

Шаблон записи:

```
## ГГГГ-ММ-ДД — Название фичи
Ветка: `feature/…` · PR: ссылка
- Что сделано: …
- Решения: … и почему так
- Файлы: …
- Проверки: lint ✓ · build ✓ · визуально ✓ или —
- Design gaps и вопросы: …
```

---

## 2026-10-06 — Мои кампании: список
Ветка: `feature/campaigns` · PR: https://github.com/Bekaa1/apex-admin/pull/3
Дизайн: «Apex — Мои кампании» https://claude.ai/artifact/RfDdgYYsieCJF2gF9xQp8H (версия 1791306169-f9ee)

**Что сделано**
- Общее для разделов кабинета вынесено из главной, поведение главной не изменилось (сверено расчётом на демо):
  - `allRows` переехал в `lib/supabase.ts`;
  - `cabinet/stores.ts`, `plays.ts`, `campaignBudget.ts`, `queryKeys.ts`, `ui/LoadError.tsx`.
- Тарифы по дизайну:
  - Перенесены в `cabinet/tariffs.ts`, тексты — в `cabinet.tariffs.*`.
  - В гиде на главной 4-й тариф теперь «Корпоративный, по договорённости» вместо «Эксклюзив, от 5 000 000», как в новом дизайне.
- Каркас:
  - маршруты `campaigns/new`, `campaigns/:id/fix` и `campaigns/corporate` (пока заглушки);
  - `hideCreate` в handle маршрута прячет «Создать кампанию» в мастере;
  - чек, тарифы, цепочка шагов, заметка и текст hero перенесены из `home.css` в `cabinet.css`;
  - на телефоне заголовок переносится на 2 строки;
  - статус «Нет бюджета» (danger) заменил «Бюджет закончился».
- Кит:
  - блок «v4 — campaigns» из дизайна: select, search, tabs, chip, choice, stepper, timeline, drop, textarea;
  - 18 иконок;
  - компоненты `Tabs`, `SearchField`, `Select`, `Timeline`.
- Список «Мои кампании» (`cabinet/campaigns/`):
  - вкладки Все / Идут показы / На модерации / Завершённые со счётчиками;
  - поиск, показы за 7 дней / 30 дней / всё время, сортировка;
  - сводка «N кампаний · X показов за период»;
  - строки для состояний: на проверке, ждёт оплаты, отклонена, активна (и с низким бюджетом), на паузе, часы закончились, нет бюджета, завершена;
  - «До запуска» (таймлайн), причины модератора, счёт;
  - пустой список, «Ничего не нашли», загрузка, ошибка, корпоративный баннер.
- Данные:
  - `my_campaigns_stats` (+ start/end_date), `my_daily_plays_by_campaign` за 30 дней, свои `ads` (обложка, магазин), `stores`;
  - фильтры хранятся в URL (`tab`, `q`, `period`, `sort`).

**Решения**
- Черновиков нет (решение пользователя). Статусы `draft`, `archived` и `deleted` в списке не показываем.
- Тариф, число магазинов и тележек, оплата, «Ждёт оплаты» и причины отклонения — поля из запроса бэкенду.
  - В типах они необязательные (`RequestedFields`). Строка показывает их, как только вью начнёт их отдавать; до этого эти части скрыты.
  - `?demo=active` показывает все состояния дизайна.
- Название тарифа берётся по коду из i18n, поэтому переводится на kk и en.
- Магазины кампании без данных бэкенда считаются по `ads.store_id`: «Все магазины» — это все реальные магазины.
- «Пополнить» и «Как оплатить» ведут в карточку кампании, как на главной: экраны оплаты не нарисованы.
- «Исправить» ведёт в `campaigns/:id/fix`, «Повторить» — в `campaigns/new?copy=`. Обе страницы появятся в PR мастера.
- Сортировка «По остатку бюджета»: сначала кампании с наименьшим остатком; завершённые и без бюджета — в конце.
- Где дизайн расходится с китом, сделано по киту:
  - чип и кнопка очистки поиска 44px;
  - компактная сортировка 44px вместо 46;
  - размеры шрифтов по шкале: 12 / 12,5 / 13,5 → 13–14, 18 → 20;
  - Onest 400/600 вместо 500;
  - радиусы — токены;
  - белый на обложке — `--on-primary`.
  - Правило записано в CLAUDE.md.

**Файлы:** `src/cabinet/campaigns/**`, `src/cabinet/{stores,plays,campaignBudget,queryKeys,tariffs}.ts`, `src/cabinet/ui/LoadError.tsx`, `src/design-system/{Tabs,SearchField,Select,Timeline}.tsx`, `components.css`, `Icon.tsx`, `src/i18n/campaigns.*.json`, `CLAUDE.md`.

**Проверки**
- tsc ✓, lint ✓ (8 старых предупреждений), build ✓, демо-фикстур в `dist` нет.
- Модель на демо: вкладки 8 / 3 / 4 / 1, «19 540 показов за 7 дней», как в дизайне. Главная после переноса общих модулей считает то же: 18 420 показов, +12 %, остаток 2 610 000 ₸, 14 магазинов.
- Визуально, на временной странице с демо-сессией (удалена, в git не попала):
  - 1440: светлая и тёмная тема, ru и kk;
  - 390: список и пустое состояние;
  - состояния `?demo=active`, `new`, `loading`, `error`, «Ничего не нашли» по поиску — сверены с артбордами «ещё нет кампаний», «загрузка», «ошибка загрузки», «ничего не найдено». Вкладки «Черновики» нет, поэтому в скелетоне 4 вкладки вместо 5.
- Живые данные (07.10, пользователь вошёл во встроенном браузере):
  - 5 запросов (`users` и 4 запроса списка), все 200, около 1,2 с;
  - `ads` с фильтром по `user_id`, показы за 30 дней (`play_date` от сегодня−29 до сегодня);
  - у аккаунта нет кампаний, показан пустой список; главная открывается без ошибок.
- Исправлено после живой проверки: повторяющийся ключ в скелетоне загрузки (предупреждение React в консоли).

**Design gaps**
- В дизайн-системе «Apex» нет Tabs, SearchField, Select, Timeline, Stepper, ChoiceCard, Chip, FileDrop и Textarea.
- Не нарисованы:
  - строки «На паузе» и «Часы закончились»;
  - пустая вкладка без поиска («Ничего не нашли»);
  - экраны оплаты и пополнения;
  - карточка кампании.

## 2026-10-06 — Запрос бэкенд-разработчику: кампании, модерация, оплата
Ветка: `feature/campaigns` · Пользователь пересылает текст ниже как есть. Всё проверено только чтением (06.10), в базе ничего не менялось.

### Контекст
Фронт делает раздел «Мои кампании» (список) и мастер «Новая кампания» (5 шагов: ролик и описание → тариф → магазины → зоны у полок → бюджет и проверка). Схема запуска: **кампания запускается, когда ролик одобрен И бюджет оплачен, в любом порядке**. Оплатить можно, пока идёт проверка.

**Что есть сейчас:**
- `ads`. Рекламодатель пишет свои строки напрямую (политика `advertiser_manages_own_ads`, FOR ALL). Нет полей `tariff_id`, `description`, модерации и оплаты.
- `ad_stores` / `ad_zones`. Писать может только админ. `ad_stores` рекламодатель даже не читает, поэтому `my_campaign_locations` отдаёт ему только зоны.
- `tariffs`. 5 тарифов, которые не совпадают с дизайном.
- `carts`. Рекламодатель их не читает, а `stores.cart_ids` пустые.
- Storage. Есть только публичный бакет `documents`: без лимитов, разрешён только INSERT.
- Расход бюджета. `process_playback_log` списывает `zones.price_per_hour × секунды`.
- Синхронизация. `sync_with_admin` в «Cart» берёт только `ads.status = 'active'` (и `ad_stores.status = 'active'`, `ad_zones`), а start/end_date проверяет сам. Поэтому новые статусы до `active` синхронизацию не трогают.

**Что уже сделал фронт:**
- Список читает `my_campaigns_stats`, `my_daily_plays_by_campaign`, свои `ads` (обложка, store_id) и `stores`.
- Мастер берёт тарифы из констант по дизайну, магазины и зоны — из `stores` и `zones`. Ролик и обложка грузятся в `documents` по пути `campaigns/<uid>/<uuid>.<ext>`.
- Кнопка «Отправить на проверку» выключена до `submit_campaign`. Черновиков нет.

**Срочность:**
- P1 — чтобы включить отправку из мастера, желательно к 08.10.
- P2 — статусы модерации и оплаты и реальный запуск.
- P3 — корпоративный тариф и безопасность.

После изменений коротко напишите, что сделано. Мы перегенерируем типы (`generate_typescript_types`) и подключим.

---

### P1.1 Тарифы как в дизайне
Используется в шаге 2 мастера и в гиде на главной.

| code | Название | Мин. бюджет | Выбор магазинов | Зоны у полок (шаг 4) | Больше показов в ротации | Только ваш бренд в зоне | Самостоятельно в мастере |
|---|---|---|---|---|---|---|---|
| standard | Стандарт | 500 000 ₸ | да | нет | нет | нет | да |
| zones | Стандарт + Зоны | 1 000 000 ₸ | да | да | нет | нет | да |
| premium | Премиум | 2 000 000 ₸ | да | да | да | нет | да |
| corporate | Корпоративный | по договорённости | да | да | да | да | нет, только заявка |

`price_per_play` в дизайне не показывается, задайте сами. Лишние тарифы из базы (Оптимальный, Классический, Бизнес) уберите или выключите — это решение бизнеса.
```sql
alter table public.tariffs
  add column code text unique,
  add column has_zones boolean not null default false,
  add column priority_rotation boolean not null default false,
  add column self_serve boolean not null default true;
-- затем привести строки к таблице выше (name, min_amount, флаги, code)
```
Фронт берёт тексты карточек из i18n по `code`, а минимум — из `min_amount` по `code`.

### P1.2 Поля кампании
```sql
alter table public.ads
  add column tariff_id uuid references public.tariffs(id),
  add column description text check (char_length(description) <= 300),
  add column video_duration_sec numeric(5,2),
  add column video_width int,
  add column video_height int,
  add column video_size_bytes bigint,
  add column submitted_at timestamptz;
-- название ≤ 80 символов (сначала проверьте текущие строки)
alter table public.ads add constraint ads_title_len check (char_length(title) <= 80);
```
`content_url` остаётся обложкой (картинка), `video_url` — роликом.

### P1.3 RPC отправки кампании (атомарно)
`public.submit_campaign(p jsonb) returns uuid`: security definer, работает от `auth.uid()`, `grant execute` для authenticated.

Вход:
```json
{
  "name": "Осенняя распродажа",
  "description": "Скидки до 30% …",
  "tariff_code": "premium",
  "video": { "url": "https://…", "file_name": "autumn.mp4", "duration_sec": 7.0, "width": 1920, "height": 1080, "size_bytes": 18000000 },
  "cover": { "url": "https://…", "file_name": "cover.jpg" },
  "store_ids": ["uuid", "uuid"],
  "zone_ids": ["uuid", "uuid"],
  "budget": 2500000
}
```
`cover` может быть `null`, `zone_ids` — пустым для тарифа без зон.

**Проверки** (повторяют проверки фронта). Ошибку возвращать кодом в `message`, тогда фронт покажет её у нужного поля:
- `name` — от 1 до 80 символов → `invalid_name`;
- `video.url` задан, длительность 7 ± 0,3 с, 16:9, не меньше 1280×720 → `invalid_video`;
- тариф существует и `self_serve` → `invalid_tariff`;
- хотя бы один магазин, магазины существуют, без «Все магазины» → `invalid_stores`;
- если у тарифа `has_zones`: в каждом выбранном магазине хотя бы одна зона, и все зоны из выбранных магазинов. Если зон у тарифа нет, `zone_ids` пусто → `invalid_zones`;
- `budget ≥ tariffs.min_amount` → `invalid_budget`.

**Действия:**
- insert `ads`: `user_id = auth.uid()`, `status = 'pending'`, `submitted_at = now()`, `title = name = p.name`, `tariff_id`, `description`, видео и обложка, `budget`;
- insert `ad_stores` со `status 'active'` и insert `ad_zones` — их забирает синхронизация;
- `ads.store_id` и `ads.zone_id` для совместимости: если выбран один магазин, ставить его, иначе NULL (триггер подставит «Все магазины» / «Все зоны»);
- выставить счёт `initial` (P2.3);
- вернуть `id`.

`public.resubmit_campaign(p_ad_id uuid, p jsonb) returns void` нужна для кнопки «Исправить». Работает только для своей кампании со статусом `rejected`, проверки те же. Обновляет поля, заменяет `ad_stores`/`ad_zones`, очищает поля модерации, ставит `status = 'pending'` и `submitted_at = now()`.

### P1.4 Storage для роликов и обложек
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-media', 'campaign-media', true, 52428800,
        array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png']);

create policy "campaign media: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "campaign media: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);
```
- Требования к ролику из дизайна: MP4 или MOV, ровно 7 секунд, горизонтальный 16:9, от 1280×720, до 50 МБ.
- Обложка — JPG или PNG.
- Когда бакет появится, фронт переключится на путь `<uid>/<uuid>.<ext>`.
- Нужна чистка осиротевших файлов: ролик загрузили, а кампанию не отправили. Например, раз в сутки удалять файлы старше 24 ч, на которые нет ссылки из `ads`.
- Проверьте, что `video_ok()` в «Cart» принимает ссылки нового бакета.

### P1.5 Каталог для шагов 3–4 (магазины и зоны)
Используется в шаге 3 («Выбрано 6 из 10 · 330 тележек», в строке «N кампаний сейчас», «N зон у полок») и в шаге 4 (у каждой зоны «ещё N брендов» / «пока только вы»).

Нужны функции, доступные authenticated. Не отдавать служебные «Все магазины» / «Все зоны» и MAC маячков из `zones.description`. Лучше функции, а не SECURITY DEFINER-вью: advisors уже ругаются на 22 таких вью.
```sql
create or replace function public.get_store_catalog()
returns table (id uuid, name text, address text, city text,
               cart_count int, zone_count int, active_campaigns_count int)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.address, s.city,
         (select count(*)::int from carts c where c.store_id = s.id),
         (select count(*)::int from zones z where z.store_id = s.id),
         (select count(distinct a.id)::int from ad_stores x join ads a on a.id = x.ad_id
           where x.store_id = s.id and a.status = 'active')
  from stores s where s.name <> 'Все магазины';
$$;

create or replace function public.get_zone_catalog()
returns table (id uuid, store_id uuid, name text, other_brands_count int)
language sql stable security definer set search_path = public as $$
  select z.id, z.store_id, z.name,
         (select count(distinct a.user_id)::int from ad_zones x join ads a on a.id = x.ad_id
           where x.zone_id = z.id and a.status = 'active' and a.user_id <> auth.uid())
  from zones z where z.name <> 'Все зоны';
$$;
grant execute on function public.get_store_catalog(), public.get_zone_catalog() to authenticated;
```
Фильтр «Сеть» в шаге 3 сейчас строится по `stores.name`. Если нужна отдельная сеть (например, «Береке Маркет» с несколькими адресами), нужно поле `stores.chain`.

### P1.6 Данные для списка «Мои кампании»
Расширить `my_campaigns_stats` (security_invoker, фильтр `auth.uid()`) или сделать `my_campaign_cards`:
- `tariff_code`, `tariff_name`, `description`, `video_url`, `content_url`, `submitted_at`;
- `store_count`, `cart_count` (сумма тележек в магазинах кампании), `zone_count`;
- поля модерации (P2.1) и оплаты (P2.3): `paid_amount`, а также сумма последнего неоплаченного счёта и почта, на которую он ушёл.

Строка списка в дизайне: «Премиум · 6 магазинов · 330 тележек», «Ждёт оплаты — Ролик одобрен», «Счёт на 1 200 000 ₸ отправили на …», «Модератор вернул кампанию: <правила> + комментарий».

Рекламодателю нужен SELECT своих `ad_stores`:
```sql
create policy advertiser_reads_own_ad_stores on public.ad_stores for select to authenticated
  using (exists (select 1 from public.ads a where a.id = ad_stores.ad_id and a.user_id = auth.uid()));
```

### P1.7 RLS `ads` (критично: с оплатой это прямая дыра)
Сейчас любой вошедший пользователь:
- читает все кампании через `authenticated_can_read_ads_for_playback` (USING true);
- меняет у своих кампаний `status` (может сам поставить `active` без модерации и оплаты), `budget`, `spent_budget` и удаляет их.

Нужно: рекламодателю — только SELECT своих, запись — только через RPC (security definer). Админу — всё.
```sql
drop policy authenticated_can_read_ads_for_playback on public.ads;
drop policy advertiser_manages_own_ads on public.ads;
create policy advertiser_reads_own_ads on public.ads for select to authenticated
  using (user_id = auth.uid());
create policy admin_manages_ads on public.ads for all to authenticated
  using (is_apex_admin()) with check (is_apex_admin());
-- partner_reads_campaigns_on_own_stores остаётся.
-- Проверьте, кому ещё нужно читать ads: плеер, Cart (sync идёт по ключу?), админка.
```

---

### P2.1 Модерация
```sql
alter table public.ads
  add column rejection_reasons text[] not null default '{}',
  add column moderator_comment text,
  add column moderated_at timestamptz,
  add column moderated_by uuid references auth.users(id);
```
Коды правил. Фронт показывает их текстом; это те же 6 правил, что в карточке «Что проверит модератор»:

| Код | Правило |
|---|---|
| `duration_7s` | Ролик ровно 7 секунд, горизонтальный 16:9 |
| `languages_kk_ru` | Текст в ролике — на казахском и русском языках |
| `prohibited` | Без запрещённой рекламы: алкоголь, табак и вейпы, азартные игры и ставки |
| `claims` | «Лучший», «№ 1» и подобное — только с подтверждением |
| `flashing` | Без резких вспышек и быстрого мигания |
| `metadata` | Название, описание и обложка соответствуют ролику |

RPC для админки: `public.moderate_campaign(p_ad_id uuid, p_decision text, p_reasons text[], p_comment text)`, только `is_apex_admin()`. `p_decision` — `approve` или `reject`.
- `approve`: оплачено → `active`, иначе → `awaiting_payment`.
- `reject`: `rejected` с причинами и комментарием.

Рекламодателю — письмо с результатом («Результат придёт на почту»). Срок проверки из дизайна: «обычно до 24 часов в рабочие дни».

### P2.2 Статус «Ждёт оплаты» и переходы
```sql
alter type public.ad_status add value 'awaiting_payment';
-- в set_magnum_ads_defaults: 'awaiting_payment' → 'Ждёт оплаты'
```

| Из | Событие | Кто | В |
|---|---|---|---|
| — | `submit_campaign` | рекламодатель | `pending` |
| `pending` | одобрение, оплачено | модератор | `active` |
| `pending` | одобрение, не оплачено | модератор | `awaiting_payment` |
| `pending` | отклонение | модератор | `rejected` |
| `rejected` | `resubmit_campaign` | рекламодатель | `pending` |
| `awaiting_payment` | счёт оплачен | админ, оплата | `active` |
| `active` | `spent_budget ≥ budget` | триггер | `budget_ended` |
| `budget_ended` | пополнение оплачено | админ, оплата | `active` |
| `active` / `budget_ended` | завершение | ? | `completed` |

**Главное правило:** `active` только при одобрении И оплате. Синхронизацию с планшетами трогать не нужно, она берёт только `active`.

**Вопрос:** когда кампания становится «Завершена»? В мастере нет дат, показы начинаются сразу после запуска. В списке у завершённой показан период «1 июн. — 31 июл.». Нужно бизнес-правило: вручную, по дате окончания или после исчерпания бюджета без пополнения.

### P2.3 Счета и оплата
```sql
create table public.campaign_invoices (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  number text not null unique,
  kind text not null check (kind in ('initial', 'top_up')),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'issued' check (status in ('issued', 'paid', 'cancelled')),
  sent_to text,
  pdf_url text,
  issued_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.campaign_invoices enable row level security;
create policy own_invoices_select on public.campaign_invoices for select to authenticated
  using (user_id = auth.uid());
alter table public.ads add column paid_amount numeric(14,2) not null default 0;
```
- **Счёт при отправке.** `submit_campaign` выставляет счёт `initial` на сумму бюджета и отправляет его письмом на почту аккаунта. В дизайне: «Счёт на 2 500 000 ₸ придёт на marketing@company.kz. Оплатить можно уже сейчас.»
- **Оплата.** Админ отмечает её через `public.mark_invoice_paid(p_invoice_id uuid)`: ставит `paid_at` и `status = 'paid'`, увеличивает `ads.paid_amount`.
  - Если кампания `awaiting_payment` → `active`.
  - Если `budget_ended` и это пополнение → `budget += amount` и `active`.
- **Пополнение.** Кнопки «Пополнить» и «Как оплатить» в списке: `public.request_top_up(p_ad_id uuid, p_amount numeric)` выставляет счёт `top_up`. Экран оплаты и пополнения ещё не нарисован.

### P2.4 Расход бюджета по цене за показ
Дизайн: «Показы списываются из бюджета. Когда он закончится, показы остановятся — пополните, и они продолжатся.»
- `process_playback_log` списывает `zones.price_per_hour × секунды`. Нужно перейти на списание `tariffs.price_per_play` за засчитанный показ, а `budget_ended` ставить при `spent_budget ≥ budget`.
- `select_ad_for_zone` отсекает кампании без `total_hours`: генерируемый `remaining_impressions` у них равен 0. Новые кампании (бюджетные, без часов) не должны от этого зависеть.

---

### P3.1 Корпоративный тариф: заявка
```sql
create table public.corporate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  company text not null check (char_length(company) between 1 and 200),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  phone text not null,
  message text check (char_length(message) <= 1000),
  source text not null check (source in ('wizard', 'list')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);
alter table public.corporate_requests enable row level security;
create policy corp_requests_insert_own on public.corporate_requests for insert to authenticated
  with check (user_id = auth.uid());
create policy corp_requests_select_own on public.corporate_requests for select to authenticated
  using (user_id = auth.uid());
```
- Нужно уведомление менеджерам (почта или Telegram) и копия заявки на почту аккаунта. В дизайне: «Менеджер перезвонит в течение рабочего дня. Копию заявки отправили на …»
- Для страницы нужны реальные контакты менеджеров: имена, должности, телефоны, почты, адрес офиса и часы работы. Сейчас в дизайне заглушки, поэтому на сайте их пока скрываем.

### P3.2 Безопасность (открыто с прошлого запроса)
- **Права anon.** У anon полные права (INSERT/UPDATE/DELETE/TRUNCATE) на `ads`, `ad_stores`, `ad_zones`, `carts`, `stores`, `tariffs`, `zones`, `invoices`, `payments` и другие таблицы. Нужно `revoke all … from anon` везде, где он не нужен.
- **RLS выключен** на `zones`, `documents` и остальных таблицах из прошлого списка (`playback_logs`, `store_daily_stats`, `auctions`, `auction_bids`, `filtr`).
- **Бакет `documents`** публичный и без лимитов.

## 2026-10-06 — Ревью PR #2 перед объединением
Ветка проверки: `review/pr-2-home-data` · PR: https://github.com/Bekaa1/apex-admin/pull/2
- Исправлена неполная загрузка данных при достижении лимита строк PostgREST: все четыре источника читаются страницами с устойчивой сортировкой и `count: exact`. Следующее смещение считается по реально полученным строкам, поэтому учитывается и уменьшенный серверный лимит.
- Дневная статистика ограничена обеими границами 14-дневного окна. Запросы получают AbortSignal react-query, чтобы отменяться при выходе из аккаунта/размонтировании.
- Только SELECT в Supabase: сверены определения `my_campaigns_stats`, `my_daily_plays_by_campaign`, `my_ad_stats_summary`; фильтрация по `auth.uid()` и границы недель подтверждены.
- Подтверждена существующая политика `authenticated_can_read_ads_for_playback` с `USING true`. Фронт сохраняет фильтр своих `ads`; исправление RLS остаётся отдельной задачей бэкенда.
- Проверки: lint без ошибок (8 прежних предупреждений), build с локальной конфигурацией Supabase успешен (прежнее предупреждение о размере общего JS-файла), `git diff --check` чистый, демо-фикстур в production-сборке нет.
- Автотесты и повторный вход под реальным пользователем в рамках этого ревью не запускались. Схема, данные и политики базы не изменялись.
- Справка по лимиту и пагинации: https://supabase.com/docs/reference/javascript/select

## 2026-10-06 — Главная: подключение к Supabase
Ветка: `feature/home-data` · PR: https://github.com/Bekaa1/apex-admin/pull/2
- Что сделано:
  - Сгенерированы типы базы `src/lib/database.types.ts` (MCP `generate_typescript_types`). Клиент `src/lib/supabase.ts` теперь типизирован `Database`.
  - Типы строк главной (`home/types.ts`) и статусы кампаний (`campaignStatus.ts`) берутся из сгенерированных типов.
  - `src/cabinet/home/api.ts` — `fetchHomeSource(userId)`, четыре запроса на чтение параллельно:
    - `my_campaigns_stats`: ad_id, title, name, status, budget, spent_budget, remaining_budget, total_plays, created_at;
    - `my_daily_plays_by_campaign`: ad_id, play_date, plays с `play_date ≥ сегодня−13` (Алматы);
    - `ads`: id, content_url, store_id с фильтром `user_id = текущий пользователь`;
    - `stores`: id, name, city.
  - `useHomeState` переведён на react-query:
    - ключ `['home', userId]`; без сессии запрос не идёт (`skipToken`);
    - `select: buildHomeData`;
    - состояния loading → error с «Повторить» → ready; demo только в dev.
  - Показы за 7 дней, дельта к прошлым 7 дням и показы в строках считаются из одной дневной статистики. Окна те же, что во вью `my_ad_stats_summary`.
  - `src/lib/dates.ts`: `todayInAlmaty`, `shiftDate`.
  - Локальный `.env.local` (в git не попадает): URL проекта и publishable-ключ.
- Сверено с базой (только чтение):
  - вью фильтруют по `auth.uid()`;
  - окна показов: today−6…today и today−13…today−7;
  - `title` и `name` у всех кампаний совпадают;
  - `content_url` — готовая https-ссылка;
  - «Все магазины» — отдельная запись `stores` без города;
  - миграция Беки применена: `users` видны только свои, `complete_signup_profile` есть.
  - Все 4 запроса проверены на REST с anon-ключом: 200, пустой ответ, как и должно быть без входа.
- Проверки:
  - `tsc` ✓, lint ✓ (8 старых предупреждений кита), build ✓, демо-фикстур в `dist` нет.
  - Без сессии `/cabinet` ведёт на `/login`.
  - Живая проверка (пользователь вошёл во встроенном браузере):
    - после входа уходит 5 запросов (`users` и 4 запроса главной), все 200, 0,2–0,4 с;
    - у аккаунта без кампаний показывается гид, ошибок в консоли нет.
  - Исправлено: пустая строка в `users.company_name` показывала пустое имя. Теперь показывается «Компания не указана» (`cabinet/api.ts`).
  - Сводка с реальными кампаниями посчитана SQL-запросом для владельца 47 тестовых кампаний:
    - 47 активных, 1 825 показов за 7 дней (все сегодня, поэтому дельты нет);
    - остаток 5 837 ₸, 1 кампания с низким бюджетом, 1 магазин в Алматы.
    - Модель такие данные обрабатывает.
    - Войти под этим аккаунтом в интерфейсе не проверял: нет доступа.
- Запросы бэкенд-разработчику (переслать):
  1. Безопасность: политика `authenticated_can_read_ads_for_playback` (USING true) на `ads` даёт любому вошедшему читать все кампании, их бюджеты и креативы. Ограничить: владелец, админ или роль `cart` — либо отдавать плееру данные через RPC.
  2. Добавить во вью `my_campaigns_stats` поля `content_url` и `store_id` (а потом название тарифа). Тогда фронт не будет читать `ads` напрямую.
  3. Тариф у кампании: `ads.tariff_id → tariffs` и название тарифа во вью.
  4. Привести `tariffs` к дизайну (Стандарт от 500 000, Стандарт + Зоны от 1 000 000, Премиум от 2 000 000, Эксклюзив от 5 000 000 ₸) или подтвердить, что верна база.
  5. Индексы:
     - `ads(user_id)` — по нему фильтруются все `my_*` вью;
     - `ad_view_history(ad_id, viewed_at)` — дневная статистика.
     Сейчас у обеих таблиц есть только первичный ключ.
  6. До сих пор без RLS: `zones`, `playback_logs`, `store_daily_stats`, `documents`, `auctions`, `auction_bids`, `filtr`. Это общий список безопасности.

## 2026-10-06 — Ревью и интеграция кабинета с текущим main
Ветка проверки: `review/pr-1-cabinet` · PR: https://github.com/Bekaa1/apex-admin/pull/1
- Исправлены конфликты зависимостей, lock-файла, App и main. Корневой index.html сохранён.
- Роутер подключён к существующим LoginFlow, SignupFlow, OTP, второму шагу регистрации и сбросу пароля. Сохранены /privacy, /offer и возврат из документов на регистрацию.
- Переходы авторизации используют react-router; contact, channel и purpose передаются в location.state. Сохранена совместимость со старыми query/history-переходами.
- AuthSessionProvider отслеживает сессию Supabase. RequireSession защищает /cabinet/*; выход завершает текущую сессию и очищает react-query. При смене пользователя кэш также очищается.
- Блок аккаунта читает company_name только своего public.users через cabinet/api.ts, при активной сессии. Контакт берётся из сессии; предусмотрены загрузка и ошибка.
- Исправлено переполнение мобильной шапки документов. Добавлен экран ожидания для первоначальной загрузки маршрутов кабинета. Демо аккаунта исключено из production-сборки.
- Проверки: lint без ошибок (8 прежних предупреждений), build успешен (предупреждение о крупном общем JS-чанке). Отдельно проверены нормализация номера, передача состояния OTP/сброса, таблица публичных и вложенных маршрутов, рендер четырёх состояний главной и ru/kk/en.
- В браузере проверены редирект без сессии, дополнение телефона после blur и возврат из оферты. Компоненты кабинета визуально проверены на демоданных в 1440/390, light/dark, включая казахские тексты. Временные HTML-превью удалены.
- Оставшиеся ограничения: главная ещё не читает статистику из Supabase; разделы кампаний, статистики, аналитики и профиля пока пустые; тарифы в гиде требуют сверки с бэкендом. На мобильном экране кнопка выхода пока отсутствует в дизайне. Живые запросы отправки OTP и выхода не выполнялись при ревью.

---

## 2026-10-06 — Каркас кабинета и Главная
Ветка: `feature/cabinet-home` (от `chore/project-setup`) · PR: https://github.com/Bekaa1/apex-admin/pull/1
Дизайн: «Apex — Кабинет» https://claude.ai/artifact/FLx9ACU6eUDqtX6LZN52Cd
- Что сделано:
  - Роутер `react-router` v7 и `@tanstack/react-query` v5.
    - `App.tsx` теперь рендерит `RouterProvider`, все маршруты описаны в `routes.tsx`; публичные адреса не изменились.
    - Кабинет открывается по `/cabinet`. Маршруты кабинета строятся из `cabinet/sections.ts`, у раздела могут быть подстраницы. Неизвестный адрес внутри кабинета ведёт на `/cabinet`.
  - Каркас по дизайну:
    - меню слева, на ширине ≤1100 — узкая колонка с иконками, на ≤760 — нижнее меню;
    - верхняя панель: заголовок, язык, тема, «Создать кампанию»;
    - аккаунт с инициалами; «Помощь» ведёт в WhatsApp;
    - разделы, которых ещё нет, — пустые заглушки.
  - Главная, четыре состояния:
    - гид для нового пользователя: hero, 5 шагов, «После оплаты», тарифы, бюджет, разделы, FAQ, поддержка;
    - сводка: предупреждение о бюджете, 4 KPI, таблица до 5 кампаний (на узком экране превращается в карточки), «Новая кампания», поддержка;
    - загрузка (скелетоны);
    - ошибка с кнопкой «Повторить».
    - «Как это работает» в сводке раскрывает шаги, тарифы и бюджет ниже на странице.
  - Дизайн-система, всё из макета:
    - 14 иконок;
    - `Meter`, `StatTile`, `Skeleton`, `Avatar`, `Disclosure`;
    - `Alert` с `action`;
    - `buttonClassName`;
    - `components.css` обновлён до версии из дизайна.
  - i18n:
    - словари `<ns>.{ru,kk,en}.json` подключаются автоматически через `import.meta.glob`;
    - новые файлы `cabinet.*` (меню, статусы кампаний) и `home.*`.
  - `lib/format.ts`: деньги, числа, проценты, списки, plural. `lib/contacts.ts`: WhatsApp +7 799 889 02 37, support@apexmedia.kz.
  - Демо `?demo=new|active|loading|error` работает только в dev. Фикстуры повторяют артборды и в прод-сборку не попадают (проверено по dist).
- Решения:
  - Стили перенесены из дизайна один в один, глобальные классы с префиксом `cab-`:
    - каркас, таблица и KPI — в `cabinet.css`;
    - гид — в `home/home.css`.
  - Таблица кампаний:
    - порядок: низкий или закончившийся бюджет, затем active, pending, rejected, paused, hours_ended, draft, budget_ended, completed; удалённые и архивные не показываем;
    - кнопка: при низком или закончившемся бюджете — «Пополнить» (ведёт в карточку кампании), у кампании, которая ещё не начала показы, — «Открыть», у остальных — «Статистика».
  - Низкий бюджет — остаток ≤ 15% у active/paused: жёлтая полоска и предупреждение по кампании с минимальным остатком. Закончившийся бюджет — красная полоска.
  - KPI «Магазины» — магазины активных кампаний; «Все магазины» означает все. Города выводим в именительном падеже: «Алматы и Астана».
  - Для kk формат чисел берём ru-RU: в браузере нет казахских данных, без этого выходит «₸ 1,000,000».
  - Подключение к Supabase ждёт клиент и сессию Беки. До этого на главной реальных данных нет, и она показывает гид. План подключения:
    - `api.ts`: `my_campaigns_stats`, `my_ad_stats_summary`, `my_daily_plays_by_campaign` за 7 дней, `ads` (обложка, store_id с фильтром по `user_id`), `stores`;
    - `useHome`: react-query, запрос идёт только при наличии сессии.
  - «Выйти» пока ведёт на `/login`. `signOut` подключим из авторизации Беки.
- Проверки:
  - lint ✓ (8 старых предупреждений кита), build ✓.
  - Визуально во встроенном браузере (dev-сервер запущен вручную, временный `index.html`):
    - ширина 1440, 1024 и 390, светлая и тёмная тема, ru, kk, en;
    - все 4 состояния;
    - переходы без перезагрузки; публичные страницы и `/cabinet/xyz` работают.
- Design gaps:
  - Тарифа у кампании нет в БД: подпись под названием появится, когда бэкенд добавит тариф.
  - Тарифы гида (4 шт.) не совпадают с таблицей `tariffs` (5 шт.).
  - Пополнения бюджета нет на бэкенде.
  - Не нарисованы:
    - цвета статусов, кроме active и pending;
    - отрицательная дельта: показываем красным без иконки;
    - закончившийся бюджет;
    - выход, помощь и аккаунт на телефоне: в дизайне нижнего меню их нет.
  - Города в именительном падеже, а в дизайне предложный: «в Алматы и Астане».
  - Черновые переводы: en для гида, kk/en для загрузки, ошибки и статусов. kk — черновик для носителя.
  - Новые компоненты Meter, StatTile, Skeleton, Avatar, Disclosure и Alert с действием стоит перенести в дизайн-систему «Apex» в Claude Design.
- Запросы бэкенд-разработчику (переслать):
  1. Добавить тариф к кампании (`ads.tariff_id → tariffs`) и название тарифа во вью `my_campaigns_stats`.
  2. Привести `tariffs` к дизайну: Стандарт от 500 000 ₸, Стандарт + Зоны от 1 000 000 ₸, Премиум от 2 000 000 ₸, Эксклюзив от 5 000 000 ₸ (или подтвердить, что верна база).
- Открытые вопросы:
  - `index.html` в main;
  - встроенное превью приложения не запускало dev-сервер (статус «starting», процесса нет), поэтому сервер запускал вручную.

## 2026-10-06 — Изучение бэкенда Supabase (только чтение)
Ветка: `chore/project-setup` · PR: https://github.com/Bekaa1/apex-admin/pull/1 (вместе с главной)
- Что сделано:
  - Агент разобрал проекты «Apex» и «Cart» в режиме только чтения: схема, вью, RPC, RLS, Auth, advisors. Ничего не изменено.
  - Сгенерированы типы БД (148 КБ, только схема `public`). Сейчас они во временной папке сессии; в фиче каркаса положим их в `src/lib/database.types.ts` или сгенерируем заново.
- Проект для веба — «Apex» (`eveylcsziemhqouazebu`).
  - «Cart» — бэкенд планшетов. Раз в час (pg_cron `admin-sync`) отправляет в «Apex» показы, зоны и тележки, а обратно забирает активные кампании.
- Сущности:
  - `users` — профиль 1:1 к `auth.users`. Строку создаёт триггер с role «Пользователь» (рекламодатель) и balance 1000. Поля: company_name, bin, phone.
  - `ads` — кампания вместе с креативом.
    - Поля: бюджет, потрачено, часы, даты, video_url, store_id и zone_id (по одному на кампанию); status — enum `ad_status`, по умолчанию pending.
    - Связки: `ad_stores`, `ad_zones`.
  - `stores` — без координат, карту не построить. `zones` — price_per_hour до 250 ₸.
  - Показы: `playback_logs` → триггер списывает бюджет → `ad_view_history`, `store_daily_stats`.
  - `tariffs` — 5 планов, с `ads` не связаны.
  - Партнёрская часть (partners, invoices, payments, reports) рекламодателю недоступна.
- Для кабинета подходят только `my_*` вью (security_invoker, фильтр по `auth.uid()`, часовой пояс Asia/Almaty):
  - `my_ad_stats_summary`, `my_campaigns_stats`;
  - `my_daily_plays`, `my_daily_plays_all_campaigns`, `my_daily_plays_by_campaign`;
  - `my_campaign_store_shares`, `my_campaign_zone_shares`, `my_campaign_locations`.
  - Остальные «статистические» вью — SECURITY DEFINER без фильтра, их не используем.
- RPC: `complete_contact_registration(p_full_name, p_bin?, p_company_name?)` для онбординга, `current_user_role()`, `is_apex_admin()`.
- Авторизация:
  - Основа — почта и пароль. Добавлен телефон с SMS-кодом: Auth Send-SMS Hook `send-sms`, только казахстанские номера, провайдер Kazinfoteh.
  - Шаблоны писем с кодом `{{ .Token }}` через MCP не видны, нужно подтвердить у бэкенд-разработчика.
- Пробелы для фронта:
  - онбординг: RPC требует ФИО, флага «онбординг пройден» нет;
  - баланс: нет ни пополнения, ни журнала операций, ни платёжки;
  - кампании: можно выбрать только один магазин и одну зону, нет поля причины отклонения;
  - магазины: нет координат;
  - статистика: нет почасовой разбивки, задержка до часа;
  - уведомления нельзя отметить прочитанными.
- Безопасность, нужно передать бэкенд-разработчику (третий разработчик, не `Bekaa1`):
  1. Критично: анонимное чтение `public.users` (политика `anon_can_read_users`). Почты, телефоны, БИН и балансы всех пользователей видны по публичному ключу.
  2. Критично: политика «Authenticated users can update any profile». Любой вошедший может менять чужие профили и баланс.
  3. Критично: RLS выключен при полных правах anon на `zones`, `playback_logs`, `store_daily_stats`, `documents`, `auctions`, `auction_bids`, `filtr`. Аноним может менять цены зон и показы.
  4. Высокий: 22 вью SECURITY DEFINER доступны anon и отдают данные всех.
  5. Высокий: `ads` видны всем пользователям. Политика FOR ALL позволяет рекламодателю самому поставить `status='active'`, обнулить потраченное и удалить кампанию каскадом вместе со счетами.
  6. Средний: anon может вызывать `get_email_by_phone`, `check_phone_exists`, `handle_beacon_detected`.
  7. Средний: публичный бакет `documents` без лимитов.
  8. Средний: проверить лимиты SMS и CAPTCHA, удалить `phone-auth-test`.
  9. Низкий: удалить `ads_backup_20261006` и схему `backup_20261004`. Часть объектов создана вне миграций, нужен `supabase db pull`.
  10. Производительность: нет индекса на `ads.user_id`, 41 внешний ключ без индекса.
- Предложенный SQL — только черновик для бэкенд-разработчика, мы ничего не выполняли.

## 2026-10-06 — Подготовка проекта: правила и документы
Ветка: `chore/project-setup` · PR: https://github.com/Bekaa1/apex-admin/pull/1 (вместе с главной)
- Что сделано:
  - Создан `CLAUDE.md`: стек, архитектура, паттерны React, правила дизайна и Supabase, git-процесс.
  - Создан этот `session-log.md`.
  - В `.oxlintrc.json` исключён дизайн-кит. Его 615 предупреждений (почти все из собранного `reference/js/app.js`) забивали вывод линтера.
  - В `.gitignore` добавлены личные файлы Claude Code.
  - Добавлен `.claude/launch.json`: dev-сервер для проверки во встроенном браузере.
  - Подключён коннектор Supabase Cloud. В организации Apex два проекта: «Apex» (`eveylcsziemhqouazebu`) и «Cart» (`yasoadhyjmstegjhcdzi`).
  - Записано правило: в Supabase только читаем, менять что-либо можно только по точной и конкретной просьбе пользователя. Бэкенд ведёт третий разработчик, правки отправляем ему запросом.
  - В ветку влит свежий `main` (21 коммит `Bekaa1`/Codex): дизайн-система, i18n, 7 экранов авторизации, лендинг, шрифты, юридические документы.
- Решения:
  - Сначала я переписал `AGENTS.md` и README под новый процесс, потом откатил эти правки. Выяснилось, что `Bekaa1` активно работает по ним через три агента Codex (`agent/1–3`). Наши правила живут только в `CLAUDE.md`, а Claude Code при наличии `CLAUDE.md` не загружает `AGENTS.md`.
  - Архитектура: оставляем плоскую структуру из `main`, которая повторяет кит. Переезд в `app / pages / features / shared` дал бы конфликты с ветками агентов. Кабинет добавляем как `src/cabinet/<раздел>/`, клиент Supabase и утилиты кладём в `src/lib/`.
  - `CLAUDE.md` и `session-log.md` хранятся в git, секретов в них нет. Личные заметки можно держать в `CLAUDE.local.md`, он в `.gitignore`.
  - Работа поделена по экранам:
    - мы делаем каркас кабинета (меню слева, навигация), главную и часть разделов;
    - `Bekaa1` (второй фронтенд-разработчик) после мержа каркаса делает остальные разделы.
    - Каждый пишет API своих экранов. Бэкенд (Supabase) ведёт третий разработчик.
    - Всего около 5 разделов, каждый отдаём целиком одному владельцу.
    - Меню и маршруты строятся из `src/cabinet/sections.ts`, поэтому новый раздел добавляется одной записью.
- Наблюдения по `main`:
  - Корневой `index.html` удалён коммитом `c8201ca` («Delete index.html», `Bekaa1`). Это точка входа Vite, без неё `npm run build` и `npm run dev` не работают. Нужно уточнить у `Bekaa1`, случайно ли это.
  - Маршрутизация сделана через `switch` по `window.location.pathname`, роутера нет.
  - Supabase к фронту не подключён: `supabaseAuth.ts` кита не перенесён, `@supabase/supabase-js` не установлен.
  - В отличие от кита, регистрация и вход принимают почту или казахстанский номер. Это сходится с SMS-функциями бэкенда (`send-sms`, `phone-auth-test`).
  - Линтер теперь проверяет код кита в `src/`. В `design-system/OtpInput.tsx` есть предупреждение `react(set-state-in-effect)`.
- Файлы: `CLAUDE.md`, `session-log.md`, `.gitignore`, `.oxlintrc.json`, `.claude/launch.json`
- Проверки после слияния с `main`:
  - lint ✓: 0 ошибок, 8 предупреждений в коде кита (`only-export-components`, `exhaustive-deps` в `theme.tsx`, `set-state-in-effect` в `OtpInput.tsx`).
  - Типы (`tsc -b`) ✓.
  - Сборка ✗: `Cannot resolve entry module index.html`. Причина — удаление `index.html` в `main`, наши файлы ни при чём.
- Ответ ИИ `Bekaa1` на текст о совместной работе. С форматом согласен, уточнения:
  - `index.html`: у него сборка проходит, и он предложил не восстанавливать файл вслепую.
    - Проверка: в актуальном `origin/main` файла нет — последний коммит, который его трогал, `c8201ca Delete index.html`. Чистый checkout не собирается.
    - Видимо, его локальная копия просто не подтянула этот коммит.
  - `react-router` и `@tanstack/react-query` подключаем в PR каркаса.
  - Supabase Auth берёт `Bekaa1`. Сценарий входа нужно зафиксировать заранее.
  - Пока `/cabinet` не защищён, пользовательские данные не читаем.
  - Фильтр по `user_id` на клиенте не заменяет RLS.
- Открытые вопросы:
  - сценарий входа: почта + пароль, только SMS или почта/телефон. Решает пользователь;
  - `index.html`;
  - роутер и `react-query` (согласовать с `Bekaa1`);
  - какие из ~5 разделов берёт `Bekaa1`, решим, когда будет готова навигация;
  - вход по почте или по телефону в итоговом флоу.

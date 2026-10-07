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

## 2026-10-07 — Profile page: итог, исправления OTP и объединение с main
Ветка: `feat/profile-page` → `main` · PR: https://github.com/Bekaa1/apex-admin/pull/4 · Squash-коммит: `22eba8c`
- Что сделано:
  - Подключена страница `/cabinet/profile`: редактирование ФИО и названия компании, добавление и смена почты или телефона.
  - Профиль загружается из собственной строки `public.users`; ФИО и компания сохраняются через `complete_signup_profile` с сохранением текущего БИН. После сохранения обновляются кэши профиля и блока аккаунта.
  - Смена email подтверждается кодами с текущей и новой почты; если текущей почты нет, подтверждается только новая. Добавление или смена телефона подтверждается SMS на новый номер.
  - Занятые контакты обрабатываются по ошибкам Supabase `email_exists` / `phone_exists`, с отдельными сообщениями для почты и телефона. Добавлены тексты ru/kk/en.
  - Исправлена повторная отправка OTP: вместо `auth.resend` с новым контактом используется `auth.updateUser` через текущую сессию. Старый запрос мог возвращать 200 без отправки, поскольку `/resend` ищет аккаунт по уже привязанному контакту.
  - В подписях полей OTP указан конкретный email. После повторной отправки очищаются введённые коды и сбрасывается этап подтверждения; отправка и проверка блокируются на время запроса, устаревшее сообщение об успешной отправке убирается при проверке.
  - Исправлен Supabase hook `send-sms`: получатель берётся из `sms.phone`, с fallback на `user.phone`. При добавлении номера `user.phone` ещё пустой, а при смене содержит старый номер — это вызывало 400 до отправки SMS. Исправление развернуто в Supabase, версия функции 44; исходники сохранены в репозитории.
  - Номер WhatsApp для помощи в кабинете исправлен на `77008890237`.
- Решения: OTP выпускает и проверяет Supabase Auth; двойное подтверждение email сохранено. Повторная отправка выполняется от имени текущего пользователя; SMS отправляется на номер, указанный Supabase для конкретного кода.
- Файлы: `src/cabinet/profile/*`, `src/cabinet/sections.ts`, `src/i18n/profile.{ru,kk,en}.json`, `src/lib/contacts.ts`, `supabase/functions/send-sms/{index,handler,routing}.ts`.
- Проверки перед объединением: lint ✓ (8 прежних предупреждений), build ✓ (прежнее предупреждение о размере общего JS-файла), конфликтов с `origin/main` нет. Деплой SMS-функции подтверждён в Supabase. Повторную доставку SMS и полный проход OTP после последнего исправления отдельно не проверяли.
- Интеграция: PR #4 объединён через Squash and merge; локальная `main` синхронизирована с GitHub. Фронтенд на сервер в рамках этого объединения не деплоили.

## 2026-10-07 — OTP при смене email и проверка занятых контактов
Ветка: `feat/profile-page`
- Смена email учитывает включённую в Supabase настройку Secure Email Change: профиль сначала принимает код с текущей почты, затем код с новой. Если текущей почты нет, подтверждается только новая.
- Ошибки `email_exists` и `phone_exists` показываются отдельно: свой текст для email и свой для номера, оба объясняют, что контакт уже привязан к аккаунту.
- В Supabase Auth → Emails → Change email address шаблон ссылки заменён на OTP с `{{ .Token }}`. Текст письма на русском и английском объясняет подтверждение обоих адресов и срок кода 10 минут. Secure Email Change оставлен включённым.
- Реальную отправку и ввод OTP не запускал, чтобы не менять контакты действующего аккаунта.
- Запрос бэкенду: безопасно очищать устаревшие незавершённые значения Auth `phone_change` старше согласованного периода жизни OTP; свежие запросы сохранять. Supabase предупреждает, что повторные устаревшие `phone_change` могут привести к подтверждению номера не тому пользователю. Очистку нужно реализовать на backend/Supabase после согласования интервала; фронтенд базу не менял.
- Файлы: `src/cabinet/profile/ProfilePage.tsx`, `src/i18n/profile.{ru,kk,en}.json`, `session-log.md`.
- Проверки: JSON ✓ · lint ✓ (8 предупреждений прежних компонентов) · build ✓ (прежнее предупреждение о крупном общем JS-файле).

## 2026-10-07 — Профиль: данные и способы входа
Ветка: `feat/profile-page`
- На странице профиля добавлено редактирование ФИО и компании, а также добавление или смена почты и телефона с OTP-подтверждением нового контакта.
- Данные профиля читаются из собственной строки `users`; сохранение использует существующий `complete_signup_profile`, чтобы не открывать прямую запись в таблицу. Для входа применяются Auth `updateUser`, `resend` и `verifyOtp` с типами `email_change` и `phone_change`.
- Добавлены русские, казахские и английские тексты; после сохранения обновляются кэши профиля и блока аккаунта.
- Файлы: `src/cabinet/profile/*`, `src/cabinet/sections.ts`, `src/i18n/profile.*.json`.
- Проверки: lint ✓ (8 предупреждений существующих компонентов), build ✓ (предупреждение Vite о крупном общем бандле), визуально ✓ (desktop). OTP и запись реальных данных не запускались.
- Design gaps и вопросы: нет.

## 2026-10-06 — Номер помощи кабинета
Ветка: `feat/profile-page`
- Общий WhatsApp-адрес для ссылки в сайдбаре и карточке помощи исправлен на `77008890237`.
- Файлы: `src/lib/contacts.ts`.
- Проверки: lint ✓ (8 существующих предупреждений), build ✓.

## 2026-10-06 — Новая кампания: мастер, экран успеха, корпоративный тариф
Ветка: `feature/campaign-wizard` (от `feature/campaigns`) · PR: https://github.com/Bekaa1/apex-admin/pull/6
Дизайн: «Apex — Мои кампании» https://claude.ai/artifact/RfDdgYYsieCJF2gF9xQp8H (версия 1791306169-f9ee)

**Что сделано**
- Мастер `campaigns/new`, 5 шагов: ролик и описание → тариф → магазины → зоны у полок → бюджет и проверка.
  - Шаг хранится в `?step=`: «Назад» браузера ведёт на прошлый шаг. Перескочить через незаполненный шаг нельзя. Для «Стандарт» шаг «Зоны» пропускается.
  - Ошибки появляются после «Далее»; сводка ошибок получает фокус. При смене шага страница прокручивается наверх, фокус встаёт на заголовок шага.
  - Сбоку сводка (тариф, магазины, тележки, зоны, бюджет) и подсказка по шагу: правила модерации, на шаге 5 — WhatsApp поддержки.
- Шаг 1: название до 80 символов, описание до 300 со счётчиком.
  - Ролик проверяется в браузере: MP4 или MOV, до 50 МБ, 7 ± 0,3 с, горизонтальный 16:9, от 1280×720.
  - Обложка: JPG или PNG, либо «Взять первый кадр ролика».
  - Загрузка в Storage идёт через XHR (`uploadToStorage` в `lib/supabase.ts`) с прогрессом, отменой и заменой файла. Пока файл грузится, закрытие вкладки спрашивает подтверждение.
- Шаг 2: три тарифа карточками; «Корпоративный» ведёт на `campaigns/corporate?from=wizard`.
- Шаг 3: поиск, город, сеть, «Выбрать все» / «Снять выбор» для видимых магазинов.
- Шаг 4: быстрый выбор зон для всех магазинов, зоны по каждому магазину, прогресс «Зоны выбраны в N из M магазинов».
- Шаг 5: бюджет с минимумом по тарифу, варианты ×1 / ×1,5 / ×2,5, проверка с «Изменить», «Что будет после отправки», отметка «Ролик соответствует правилам».
- Режимы:
  - «Повторить» (`new?copy=<id>`) — форма из своей кампании;
  - «Исправить» (`:id/fix`) — только для отклонённой, с алертом модератора и выделенными нарушенными правилами.
- Экран «Отправлено на проверку» (`:id/sent`): данные берутся из состояния перехода; без них — возврат к списку.
- Корпоративный тариф (`campaigns/corporate`): звонок и WhatsApp, преимущества, «Как начать», форма заявки. Из мастера ссылка «К выбору тарифа» возвращает на шаг 2, введённое не теряется.
- Кит: `Stepper`, `ChoiceCard`, `Chip`, `FileDrop`, `TextAreaField`, `optional` у `TextField`.

**Данные**
- Каталог мастера: `stores` без «Все магазины», `zones` без «Все зоны».
- «Повторить» и «Исправить»: своя строка `ads` (фильтр по `user_id`) и её `ad_zones`.
- Загрузка: бакет `documents`, путь `campaigns/<uid>/<uuid>.<ext>`, `x-upsert: false`.
- В `ads` мастер ничего не пишет.

**Решения**
- Черновиков нет. Введённое хранится в `sessionStorage` вкладки (ключ по пользователю и режиму) и очищается после отправки.
- Отправка выключена до RPC `submit_campaign` (п. 3 запроса): на шаге 5 кнопка неактивна, над ней info-Alert. В dev-демо отправка имитируется, чтобы проверить экран успеха.
- Форма корпоративной заявки выключена до `corporate_requests` (п. 13 запроса). Звонок и WhatsApp идут на общий номер поддержки из `lib/contacts.ts`; карточки менеджеров и офиса скрыты (в дизайне заглушки).
- Ролики грузятся в `documents`, пока нет бакета `campaign-media` (п. 4 запроса).
- Тележки, «кампаний сейчас» и «ещё N брендов» скрыты, пока каталог их не отдаёт (п. 5 запроса): колонки «Тележки» на шаге 3 нет, вместо «Кампании сейчас» колонка называется «Зоны у полок», в сводках тележек нет.
- Где дизайн расходится с китом, сделано по киту, как в списке. Пройденные шаги степпера — кнопки высотой 44px; на телефоне «Далее: <шаг>» сокращается до «Далее».

**Файлы:** `src/cabinet/campaigns/{wizard,corporate}/**`, `src/cabinet/campaigns/api.ts`, `src/cabinet/sections.ts`, `src/lib/supabase.ts`, `src/design-system/{Stepper,ChoiceCard,Chip,FileDrop,TextAreaField,TextField}.tsx`, `components.css`, `src/i18n/campaigns.*.json`, `CLAUDE.md`.

**Проверки**
- tsc ✓, lint ✓ (8 старых предупреждений), build ✓, демо-фикстур в `dist` нет.
- Модель на демо-каталоге: сводка 6 магазинов / 330 тележек / 12 зон; варианты бюджета 2 / 3 / 5 млн; «Зоны» пропускаются для «Стандарт»; устаревший прогресс загрузки игнорируется; проверки ролика; данные для отправки.
- Визуально, на временной странице с демо-сессией (удалена): шаги 1–5 с ошибками, исправление, экран успеха, корпоративный тариф, загрузка и ошибка мастера; 1440 и 390, светлая и тёмная тема.
- Исправлено после проверки: сводка ошибок пряталась под липкой шапкой и сбивалась восстановлением прокрутки.
- Живая проверка (07.10, пользователь вошёл во встроенном браузере):
  - каталог: `stores` и `zones` — 200; Carefood, 43 зоны у полок; шаги 1–5 проходят, на шаге 5 кнопка отправки неактивна;
  - ролик пользователя на 15 секунд отклонён: «Ролик длится 15 секунд — нужно ровно 7…», в Storage ничего не ушло;
  - 7-секундная копия (обрезана `avconvert`, 1280×720, 1 МБ) загружена примерно за 3 с, прогресс 0 → 36 → 73 → 100 %, ссылка отдаёт 200 и `video/mp4`;
  - обложка из первого кадра загруженного ролика снимается без ошибки CORS и загружается (JPG, 71 КБ);
  - «Отменить» прерывает загрузку (через 15 мс), файл не создаётся;
  - в `documents/campaigns/<uid>/` остались 3 тестовых файла: 2 ролика и обложка. Удалить их можно в панели Supabase.
- Исправлено после живой проверки:
  - «0 тележек» и пустая колонка «Тележки», когда каталог не знает тележек;
  - перенос между числом и единицей («2 / МБ»);
  - маленькая обложка показывалась как «1 МБ», теперь до 10 МБ — с десятыми («0,1 МБ»).

**Design gaps**
- Ссылки «Все правила размещения» нет: страницы правил нет.
- Тексты ошибок загрузки и полей, «Снять выбор» и сообщение о магазине без зон написаны по правилам кита — в дизайне их нет.
- На экране успеха нет строки «Старт»: в мастере нет даты старта.
- Артборды «Отправлено — тёмная» и «Телефон · отправлено» есть на холсте, но не попали в экспорт.
- Состояние «Корпоративный · заявка отправлена» не сделано: форма выключена до бэкенда.

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
Ветка: `feature/campaigns`, обновлено в `feature/campaign-wizard` · Пользователь пересылает текст ниже как есть. Проверено только чтением 06.10 и 07.10, в том числе синхронизация в «Cart». В базе ничего не менялось.

Что изменилось 07.10:
- `ads.store_id` — первый выбранный магазин вместо NULL: иначе триггер ставит «Все магазины», и «Cart» показывает ролик во всех магазинах.
- Тарифы: существующие колонки переиспользуются, добавляются только `code`, `more_rotation`, `self_serve`.
- `request_id` против двойной отправки; ролик и обложка должны лежать в папке пользователя.
- Точные имена полей для списка; `start_date` и `end_date` ставятся при запуске и завершении.
- Счета: существующие `invoices` и `payments` — партнёрские; новые вопросы про пользователей без почты и `users.balance`.
- Расход: `select_ad_for_zone` и `remaining_impressions`, перерасход до часа. Плюс приоритет зон и «больше показов», письма, признак подключённого магазина.

### Контекст
Фронт готов:
- «Мои кампании» — список кампаний (PR #3);
- «Новая кампания» — мастер из 5 шагов: ролик и описание → тариф → магазины → зоны у полок → бюджет и проверка (PR #6);
- экран «Отправлено на проверку» и страница корпоративного тарифа.

Сейчас мастер в базу ничего не пишет: кнопка «Отправить на проверку» выключена, пока нет RPC `submit_campaign`. Ролик и обложка уже загружаются в Storage: `documents/campaigns/<uid>/<uuid>.<ext>`.

Схема запуска из дизайна: **кампания запускается, когда ролик одобрен модератором И бюджет оплачен, в любом порядке.** Оплатить можно, пока идёт проверка.

**Что есть сейчас** (проверено чтением 07.10, новых миграций после 05.10 нет):
- `ads`: нет тарифа, описания, модерации и оплаты. Рекламодатель меняет свои строки напрямую (политика FOR ALL).
- `ad_stores`, `ad_zones`: пишет только админ. Свои `ad_stores` рекламодатель не читает.
- `tariffs`: 5 тарифов (Стандарт 100 000, Оптимальный 400 000, Классический 500 000, Бизнес 1 500 000, Корпоративный 20 000 000). В дизайне другие 4.
- `carts`: рекламодатель не читает, `stores.cart_ids` пустые.
- Storage: только публичный бакет `documents` без лимитов, разрешён только INSERT.
- Статусы `ad_status`: pending, active, rejected, draft, archived, deleted, paused, hours_ended, budget_ended, completed.
- Расход: `process_playback_log` списывает `zones.price_per_hour × секунды`.
- Синхронизация `sync_with_admin` в «Cart» (раз в час) берёт кампании `status = 'active'` с видео и в сроках.
  - Кампания подходит магазину, если `ads.store_id` — этот магазин или «Все магазины», либо магазин есть в `ad_stores` со `status = 'active'`.
  - Зоны: `ads.zone_id` или `ad_zones`; «Все зоны» означает все зоны магазина.
  - Поэтому новые статусы до `active` на показы не влияют.
- Писем нет: Edge Functions только `send-sms` и `phone-auth-test`.

**Приоритеты**
- P1 (п. 1–7) — чтобы включить отправку из мастера. Желательно к 08.10.
- P2 (п. 8–12) — модерация, оплата, запуск, расход бюджета.
- P3 (п. 13–15) — корпоративный тариф, письма, безопасность.

После каждой части коротко напишите, что сделано: имена функций, полей и коды ошибок. Фронт перегенерирует типы и подключит.

---

### P1. Включить отправку из мастера

#### 1. Тарифы как в дизайне
Используются в шаге 2 мастера, в гиде на главной и в строке списка.

| code | Название | Минимум | Выбор магазинов | Зоны у полок (шаг 4) | Больше показов в ротации | Только ваш бренд в зоне | Покупка в мастере |
|---|---|---|---|---|---|---|---|
| `standard` | Стандарт | 500 000 ₸ | да | нет | нет | нет | да |
| `zones` | Стандарт + Зоны | 1 000 000 ₸ | да | да | нет | нет | да |
| `premium` | Премиум | 2 000 000 ₸ | да | да | да | нет | да |
| `corporate` | Корпоративный | по договорённости | да | да | да | да | нет, только заявка |

Существующие колонки подходят: `can_select_store`, `can_select_zone`, `exclusive_zone`, `min_amount`, `price_per_play`, `sort_order`. Не хватает трёх:
```sql
alter table public.tariffs
  add column code text unique,                              -- standard | zones | premium | corporate
  add column more_rotation boolean not null default false,  -- «Больше показов в ротации»
  add column self_serve boolean not null default true;      -- можно купить в мастере
-- затем привести строки к таблице выше
```
- `price_per_play` в дизайне не показывается — задайте сами (нужен для расхода, п. 11).
- `has_sound` в дизайне нет — решение бизнеса.
- Оптимальный, Классический и Бизнес убрать или скрыть — тоже решение бизнеса. К кампаниям тарифы сейчас не привязаны.
- Фронт берёт названия и тексты карточек из своих переводов по `code`, минимум — из `min_amount`.

#### 2. Новые поля кампании (`ads`)
```sql
alter table public.ads
  add column tariff_id uuid references public.tariffs(id),
  add column description text check (char_length(description) <= 300),
  add column video_duration_sec numeric(5,2),
  add column video_width int,
  add column video_height int,
  add column video_size_bytes bigint,
  add column submitted_at timestamptz,
  add column request_id uuid unique;  -- защита от двойной отправки, п. 3
-- название до 80 символов; not valid — если в старых строках есть длиннее
alter table public.ads add constraint ads_title_len check (char_length(title) <= 80) not valid;
```
Существующие поля: `video_url` — ролик, `content_url` — обложка, `video_original_filename` и `cover_original_filename` — исходные имена файлов. `title` и `name` заполняются одним названием.

#### 3. RPC отправки: `submit_campaign(p jsonb) returns uuid`
`security definer`, `set search_path = public`, работает от `auth.uid()`. `grant execute` для `authenticated`, у `anon` и `public` — `revoke`.

Фронт вызывает так: `supabase.rpc('submit_campaign', { p })`. Вход:
```json
{
  "request_id": "0d7c3c1e-…",
  "name": "Осенняя распродажа",
  "description": "Скидки до 30 % на молочную продукцию до 31 октября",
  "tariff_code": "premium",
  "video": {
    "url": "https://<project>.supabase.co/storage/v1/object/public/campaign-media/<uid>/<uuid>.mp4",
    "file_name": "autumn.mp4",
    "duration_sec": 7.0,
    "width": 1920,
    "height": 1080,
    "size_bytes": 18000000
  },
  "cover": { "url": "https://…/campaign-media/<uid>/<uuid>.jpg", "file_name": "cover.jpg" },
  "store_ids": ["<uuid>", "<uuid>"],
  "zone_ids": ["<uuid>", "<uuid>"],
  "budget": 2500000
}
```
- `request_id` — uuid попытки отправки, фронт создаёт один на форму.
- `description` может быть пустой строкой → хранить NULL.
- `cover` может быть `null`.
- `zone_ids` пустой для тарифа без зон.
- `budget` — целые тенге.

**Проверки.** Они повторяют проверки фронта. Ошибку возвращать через `raise exception '<код>'`: код придёт фронту в `error.message`, уточнение — в `detail`. Фронт покажет ошибку у нужного поля.

| Код | Когда |
|---|---|
| `not_authenticated` | нет `auth.uid()` |
| `invalid_name` | после trim пусто или длиннее 80 |
| `invalid_description` | длиннее 300 |
| `invalid_video` | нет `url`; файл не в бакете `campaign-media` в папке `<auth.uid()>/` или его нет в `storage.objects`; длительность вне 6,7–7,3 с; не горизонтальный 16:9 (допуск 2 %); меньше 1280×720 |
| `invalid_cover` | `cover` передан, но файл не в папке пользователя или его нет |
| `invalid_tariff` | нет тарифа с таким `code` или `self_serve = false` |
| `invalid_stores` | список пуст; магазина нет; передан «Все магазины» |
| `invalid_zones` | тариф с зонами: в выбранном магазине нет ни одной выбранной зоны (`detail` = id магазина), зона не из выбранных магазинов или это «Все зоны». Тариф без зон: `zone_ids` не пустой |
| `invalid_budget` | не целое число или меньше `tariffs.min_amount` |

Длительность и размеры ролика присылает браузер. Модератор всё равно смотрит ролик (правило `duration_7s`, п. 8).

**Действия — одной транзакцией:**
1. Если у пользователя уже есть кампания с таким `request_id`, вернуть её `id` и ничего не создавать.
2. Insert `ads`:
   - `user_id = auth.uid()`, `status = 'pending'`, `submitted_at = now()`;
   - `title = name = p.name`, `description`, `tariff_id`;
   - `video_url`, `video_original_filename`, метаданные ролика, `content_url`, `cover_original_filename`;
   - `budget`, `spent_budget = 0`, `request_id`;
   - `total_hours`, `hours_per_day`, `start_date`, `end_date` — NULL: часов в новой модели нет, дата старта ставится при запуске (п. 9).
3. **`ads.store_id` — первый выбранный магазин, не NULL.**
   - При NULL триггер `set_magnum_ads_defaults` ставит «Все магазины», а синхронизация «Cart» считает такую кампанию подходящей любому магазину. Ролик пошёл бы во всех магазинах, а не в выбранных.
   - Полный список магазинов — в `ad_stores`.
4. **`ads.zone_id` — NULL**, триггер поставит «Все зоны». Так и задумано:
   - все тарифы идут в общей ротации на всех тележках выбранных магазинов;
   - выбранные зоны через `ad_zones` дают приоритет (синхронизация ставит им `specific = true`).
5. Insert `ad_stores` (`ad_id`, `store_id`, `status = 'active'`) — по строке на магазин.
6. Insert `ad_zones` (`ad_id`, `zone_id`) — по строке на зону.
7. Выставить счёт на бюджет (п. 10), когда появятся счета.
8. Вернуть `ads.id`. Фронт откроет экран «Отправлено на проверку».

**`resubmit_campaign(p_ad_id uuid, p jsonb) returns uuid`** — для кнопки «Исправить».
- Только своя кампания со статусом `rejected`, иначе `not_found` или `invalid_status`.
- Проверки те же.
- Обновляет поля, заменяет `ad_stores` и `ad_zones`, очищает поля модерации (п. 8), ставит `status = 'pending'` и `submitted_at = now()`.
- Вопрос: что делать со счётом, если бюджет изменился, а счёт уже выставлен или оплачен?

Бакет `campaign-media` (п. 4) нужен вместе с RPC: до него фронт грузит в `documents/campaigns/<uid>/`. Либо на переходный период принимайте оба пути.

#### 4. Storage: бакет `campaign-media`
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-media', 'campaign-media', true, 52428800,
        array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png']);

create policy "campaign media: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "campaign media: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-media' and (storage.foldername(name))[1] = auth.uid()::text);
```
- Бакет публичный, потому что `video_ok()` в «Cart» проверяет ролик HEAD-запросом по ссылке, а плеер скачивает ролик по ней же. Для приватного бакета понадобятся подписанные ссылки и правки в «Cart».
- Требования из дизайна: ролик MP4 или MOV, ровно 7 секунд, горизонтальный 16:9, от 1280×720, до 50 МБ; обложка JPG или PNG.
- Фронт переключится на путь `campaign-media/<uid>/<uuid>.<ext>`. Удаление своих файлов нужно для «Заменить» и «Удалить» в мастере.
- Чистка: раз в сутки удалять файлы старше 24 часов, на которые нет ссылок из `ads.video_url` и `ads.content_url` (ролик загрузили, а кампанию не отправили).
- В `documents/campaigns/<uid>/` остались 3 тестовых файла с проверки 07.10: 2 ролика и обложка, загружены около 10:14–10:16 по Алматы. Их можно удалить.

#### 5. Каталог для шагов 3 и 4
Где нужен:
- шаг 3: «Выбрано 6 из 10 · 330 тележек»; в строке магазина — «N тележек», «N кампаний сейчас», «N зон у полок»;
- шаг 4: у зоны — «ещё N брендов» или «пока только вы».

Рекламодатель не читает `carts`, а `stores.cart_ids` пустые, поэтому фронт эти цифры пока прячет. Нужны функции для `authenticated`. Именно функции: на SECURITY DEFINER-вью advisors уже ругаются (их 22).
```sql
create or replace function public.get_store_catalog()
returns table (id uuid, name text, address text, city text,
               cart_count int, zone_count int, active_campaigns_count int)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.address, s.city,
    (select count(*)::int from carts c where c.store_id = s.id),
    (select count(*)::int from zones z where z.store_id = s.id and z.name <> 'Все зоны'),
    (select count(distinct a.id)::int from ads a
      where a.status = 'active'
        and (a.store_id = s.id or exists (select 1 from ad_stores x
              where x.ad_id = a.id and x.store_id = s.id and x.status = 'active')))
  from stores s
  where s.name <> 'Все магазины'
  order by s.name;
$$;

create or replace function public.get_zone_catalog()
returns table (id uuid, store_id uuid, name text, other_brands_count int)
language sql stable security definer set search_path = public as $$
  select z.id, z.store_id, z.name,
    (select count(distinct a.user_id)::int from ad_zones x join ads a on a.id = x.ad_id
      where x.zone_id = z.id and a.status = 'active' and a.user_id is distinct from auth.uid())
  from zones z
  where z.name <> 'Все зоны' and z.store_id is not null
  order by z.name;
$$;

revoke execute on function public.get_store_catalog(), public.get_zone_catalog() from public, anon;
grant execute on function public.get_store_catalog(), public.get_zone_catalog() to authenticated;
```
- Не отдавать `zones.description`: там MAC маячков.
- Решите, считать ли в «кампаниях сейчас» кампании со «Все магазины». Все 46 текущих тестовых кампаний такие.
- `sync_with_admin` в «Cart» настроен на один магазин (Carefood). Если в `stores` появится магазин без планшетов, рекламодатель сможет его выбрать. Нужен признак «магазин подключён» (например, `stores.is_live`), и каталог должен отдавать только такие магазины.
- Фильтр «Сеть» на шаге 3 строится по `stores.name`. Если у сети несколько адресов под разными названиями, нужно поле `stores.chain`.

#### 6. Данные для списка «Мои кампании»
Фронт уже ждёт эти поля в `my_campaigns_stats` и покажет их, как только они появятся. Имена важны.

| Поле | Тип | Что показывает фронт |
|---|---|---|
| `status` | + `awaiting_payment` | «Ждёт оплаты» (п. 9) |
| `tariff_code` | text | «Премиум · 6 магазинов · 330 тележек» |
| `store_count` | int | число магазинов кампании (по `ad_stores`) |
| `cart_count` | int | сумма тележек в этих магазинах |
| `paid_amount` | numeric | оплачено, если `paid_amount ≥ budget` (п. 10) |
| `invoice_amount` | numeric | сумма последнего неоплаченного счёта: «Счёт на 1 200 000 ₸ …» |
| `invoice_sent_to` | text | «… отправили на marketing@company.kz» |
| `rejection_reasons` | text[] | коды нарушенных правил (п. 8) |
| `moderator_comment` | text | комментарий модератора |
| `start_date` | timestamptz | дата запуска: «Идут показы с 4 окт.» (ставить при первом `active`, п. 9) |
| `end_date` | timestamptz | период завершённой кампании: «1 июн. — 31 июл.» |

Вью оставить `security_invoker = true` с фильтром по `auth.uid()`.

Для «Исправить» и «Повторить» фронт читает свою кампанию: строку `ads` с новыми полями из п. 2 и п. 8 и её `ad_zones` (они уже читаются). Ещё нужен SELECT своих `ad_stores`:
```sql
create policy advertiser_reads_own_ad_stores on public.ad_stores for select to authenticated
  using (exists (select 1 from public.ads a where a.id = ad_stores.ad_id and a.user_id = auth.uid()));
```

#### 7. RLS на `ads` — критично, особенно с оплатой
Сейчас:
- `authenticated_can_read_ads_for_playback` (SELECT, `USING true`): любой вошедший читает все кампании, бюджеты и ролики.
- `advertiser_manages_own_ads` (ALL): рекламодатель меняет у своих кампаний `status` (может сам поставить `active` без модерации и оплаты), `budget`, `spent_budget`, а после п. 10 — и `paid_amount`. Может их удалить.

Нужно: рекламодателю — только SELECT своих, все изменения — через RPC (security definer); админу — всё.
```sql
drop policy authenticated_can_read_ads_for_playback on public.ads;
drop policy advertiser_manages_own_ads on public.ads;
create policy advertiser_reads_own_ads on public.ads for select to authenticated
  using (user_id = auth.uid());
create policy admin_manages_ads on public.ads for all to authenticated
  using (is_apex_admin()) with check (is_apex_admin());
-- partner_reads_campaigns_on_own_stores оставить
```
Перед этим проверьте, кто ещё читает `ads` под `authenticated`:
- кабинет рекламодателя уже фильтрует по `user_id`, у него ничего не сломается;
- `sync_with_admin` ходит с секретом `receiver_service_key`; если это service_role, RLS его не касается;
- `prepare_ad_playback` — security definer, ему политика не нужна;
- админка.

---

### P2. Модерация, оплата и запуск

#### 8. Модерация
```sql
alter table public.ads
  add column rejection_reasons text[] not null default '{}',
  add column moderator_comment text,
  add column moderated_at timestamptz,
  add column moderated_by uuid references auth.users(id);
```
Коды правил. Фронт показывает их текстом; это 6 правил из карточки «Что проверит модератор»:

| Код | Правило |
|---|---|
| `duration_7s` | Ролик ровно 7 секунд, горизонтальный 16:9 |
| `languages_kk_ru` | Текст в ролике — на казахском и русском языках |
| `prohibited` | Без запрещённой рекламы: алкоголь, табак и вейпы, азартные игры и ставки |
| `claims` | «Лучший», «№ 1» и подобное — только с подтверждением |
| `flashing` | Без резких вспышек и быстрого мигания |
| `metadata` | Название, описание и обложка соответствуют ролику |

RPC для админки: `moderate_campaign(p_ad_id uuid, p_decision text, p_reasons text[], p_comment text)`. Вызывать может только `is_apex_admin()`, кампания должна быть в статусе `pending`.
- `approve`: если бюджет оплачен (`paid_amount ≥ budget`) — `active` (п. 9), иначе `awaiting_payment`.
- `reject`: `rejected` с причинами и комментарием; нужна хотя бы одна причина или комментарий.
- Заполнять `moderated_at` и `moderated_by`.

Рекламодателю — письмо с результатом (п. 14). Обещания в интерфейсе: «Модератор проверит ролик — обычно до 24 часов в рабочие дни. Результат придёт на почту.»

#### 9. Статус «Ждёт оплаты» и переходы
```sql
alter type public.ad_status add value 'awaiting_payment';
-- в set_magnum_ads_defaults добавить: 'awaiting_payment' → 'Ждёт оплаты', свой цвет
```

| Из | Событие | Кто | В |
|---|---|---|---|
| — | `submit_campaign` | рекламодатель | `pending` |
| `pending` | одобрение, бюджет оплачен | модератор | `active` |
| `pending` | одобрение, не оплачен | модератор | `awaiting_payment` |
| `pending` | отклонение | модератор | `rejected` |
| `rejected` | `resubmit_campaign` | рекламодатель | `pending` |
| `awaiting_payment` | счёт оплачен | админ (оплата) | `active` |
| `active` | `spent_budget ≥ budget` | триггер | `budget_ended` (уже есть в `process_playback_log`) |
| `budget_ended` | пополнение оплачено | админ (оплата) | `active` |
| `active`, `budget_ended` | завершение | ? | `completed` |

- **Главное правило:** `active` — только когда ролик одобрен И бюджет оплачен. Синхронизацию с планшетами трогать не нужно: она берёт только `active`.
- При первом переходе в `active` ставить `start_date = now()`, при `completed` — `end_date = now()`. Синхронизация берёт кампании с `start_date ≤ now()`, так что ей это не мешает.
- Черновиков в мастере нет, статус `draft` фронт не использует.
- **Вопрос:** когда кампания становится «Завершена»? В мастере нет дат, показы идут, пока есть бюджет. Варианты: вручную, по дате окончания или через N дней после исчерпания бюджета без пополнения. Решение бизнеса.

#### 10. Счета и оплата
Существующие `invoices` и `payments` — для кабинета партнёра: `store_id` в них обязателен, политики партнёрские. Для счетов рекламодателю предлагаем отдельную таблицу. Если хотите переиспользовать `invoices`, понадобятся `user_id`, `kind`, номер и почта, а `store_id` станет необязательным.
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
- **Счёт при отправке.** `submit_campaign` выставляет счёт `initial` на бюджет и отправляет его письмом (п. 14). В интерфейсе: «Счёт на 2 500 000 ₸ придёт на marketing@company.kz. Оплатить можно уже сейчас.»
- **Оплата.** Админ отмечает её через `mark_invoice_paid(p_invoice_id uuid)`:
  - `status = 'paid'`, `paid_at = now()`, `ads.paid_amount += amount`;
  - кампания в `awaiting_payment` → `active`;
  - кампания в `budget_ended` и счёт `top_up` → `budget += amount`, затем `active`.
- **Пополнение.** Кнопки «Пополнить» и «Как оплатить» в списке: `request_top_up(p_ad_id uuid, p_amount numeric)` выставляет счёт `top_up`. Экран оплаты ещё не нарисован.
- **Вопросы:**
  - Куда слать счёт пользователю, который зарегистрировался по телефону и почты не указал?
  - Нужны ли в счёте реквизиты компании (БИН из профиля) и PDF? Кто его формирует: база, 1С или бухгалтерия вручную?
  - `users.balance` (по умолчанию 1000) в дизайне не используется: оплата идёт счётом на бюджет кампании. Баланс больше не нужен или он как-то связан с бюджетами?

#### 11. Расход бюджета и выбор ролика
Дизайн: «Показы списываются из бюджета. Когда он закончится, показы остановятся — пополните, и они продолжатся.»
- `process_playback_log` списывает `zones.price_per_hour × секунды`. Нужно списывать `tariffs.price_per_play` за засчитанный показ. Перевод в `budget_ended` при `spent_budget ≥ budget` уже есть.
- Логи приходят из «Cart» раз в час, поэтому кампания может перерасходовать бюджет примерно на час показов. Это допустимо, или «Cart» должен сам проверять остаток?
- `select_ad_for_zone` в «Apex» новые кампании не выберет:
  - у кампании без `total_hours` генерируемая колонка `remaining_impressions` равна 0, а функция требует `> 0`;
  - магазин она ищет только по `ads.store_id`, `ad_stores` не смотрит.
  Если эта функция и `prepare_ad_playback` ещё используются, их нужно поправить; если нет — удалить, чтобы не путали.

#### 12. Приоритет зон и «больше показов»
Обещания тарифов в интерфейсе:
- «Стандарт + Зоны»: «приоритет у выбранных полок: в зоне идут только ролики с зонным тарифом»;
- «Премиум»: «ролик выходит чаще и в общей ротации, и у полок»;
- «Корпоративный»: «только ваш бренд в зоне».

`sync_with_admin` строит по одной кампании на зону на часовой слот; кампании с конкретной зоной (`specific`) идут первыми.
- Проверьте, что правило «в зоне только зонный тариф» так и работает.
- «Больше показов» для Премиум (`tariffs.more_rotation`) и эксклюзивность корпоративного тарифа (`exclusive_zone`) нужно добавить в ротацию.
- Вопрос бизнесу: во сколько раз Премиум должен выходить чаще?

---

### P3. Корпоративный тариф, письма, безопасность

#### 13. Заявка на корпоративный тариф
Форма на странице «Корпоративный тариф» уже сверстана, отправка выключена до этой таблицы.
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
- Нужно уведомление менеджерам (почта или Telegram) и копия заявки на почту аккаунта. В интерфейсе: «Менеджер перезвонит в течение рабочего дня. Копию заявки отправили на …»
- Нужны реальные контакты менеджеров: имена, должности, телефоны, почты, адрес офиса, часы работы. В дизайне заглушки, поэтому на сайте карточки скрыты. Звонок и WhatsApp сейчас ведут на общий номер поддержки.

#### 14. Письма
Нужна отправка писем:
- счёт (п. 10);
- результат модерации (п. 8);
- копия заявки на корпоративный тариф (п. 13).

Сейчас писем нет: Edge Functions только `send-sms` и `phone-auth-test`. Нужна функция отправки (Resend, SMTP или другой сервис) и шаблоны на ru и kk.

#### 15. Безопасность (открыто с прошлых запросов)
- **Права anon.** У anon полные права (INSERT/UPDATE/DELETE/TRUNCATE) на `ads`, `ad_stores`, `ad_zones`, `carts`, `stores`, `tariffs`, `zones`, `invoices`, `payments` и другие таблицы. Нужно `revoke all … from anon` везде, где он не нужен.
- **RLS выключен** на `zones`, `documents` и остальных таблицах из прошлого списка (`playback_logs`, `store_daily_stats`, `auctions`, `auction_bids`, `filtr`).
- **Бакет `documents`** публичный и без лимитов.

Полный список — в тексте, переданном бэкенд-разработчику 07.10.

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

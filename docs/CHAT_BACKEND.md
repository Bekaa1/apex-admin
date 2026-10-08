# Чат сайта: бэкенд Supabase (контракт)

## Проект

| Параметр | Значение |
|---|---|
| Название | `Chat` |
| Project ref | `twnzsfsyrdnkjbkxpynl` |
| URL | `https://twnzsfsyrdnkjbkxpynl.supabase.co` |
| Регион | ap-southeast-2 |
| Миграции | `20261007181158_chat_schema`, `20261007181212_chat_privileges`, `20261007181257_chat_message_clock_timestamp` |

Проекты Apex и Cart не затрагивались.

**Что делает бэкенд:** принимает сообщения посетителя, хранит их, хранит ответы, записанные внешней системой, и доставляет новые ответы в виджет через Realtime.

**Чего бэкенд не делает:** генерация ответов, ИИ, операторская панель, CRM и другие каналы **не входят** в эту задачу и не реализованы.

## Авторизация посетителя

Виджет входит анонимно:

```ts
const { data, error } = await supabase.auth.signInAnonymously()
```

Анонимный пользователь получает свой `auth.uid()` и роль `authenticated`. Сессия хранится supabase-js в `localStorage` и переживает перезагрузку страницы.

> **Настройка Auth:** включается в Dashboard → Authentication → Sign In / Providers → **Allow anonymous sign-ins**. Программно из этой сессии её включить нельзя (см. `CHAT_PROGRESS.md`). Без неё `signInAnonymously()` вернёт ошибку `anonymous_provider_disabled`.

Рекомендуется включить CAPTCHA (Turnstile или hCaptcha) для анонимного входа: иначе любой может массово создавать анонимных пользователей.

## Таблицы

### `public.chat_sessions`

| Столбец | Тип | Описание |
|---|---|---|
| `id` | uuid PK | id диалога |
| `visitor_user_id` | uuid, FK `auth.users` (on delete cascade) | владелец — анонимный посетитель |
| `client_key` | uuid | ключ виджета для восстановления диалога |
| `created_at`, `updated_at` | timestamptz | |
| `last_message_at` | timestamptz \| null | время последнего сообщения (посетителя или ответа) |

UNIQUE `(visitor_user_id, client_key)`; индекс по `last_message_at`.

### `public.chat_messages`

| Столбец | Тип | Описание |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid, FK `chat_sessions` (on delete cascade) | |
| `sender` | text | `visitor` \| `responder` (CHECK) |
| `body` | text | после trim 1–4000 символов (CHECK) |
| `client_message_id` | uuid | ключ идемпотентности |
| `created_at` | timestamptz | точное время вставки (`clock_timestamp()`) |

UNIQUE `(session_id, sender, client_message_id)`; индекс `(session_id, created_at, id)`.

Один и тот же `client_message_id` может быть у сообщения посетителя и у ответа: уникальность учитывает `sender`. Это позволяет внешней системе использовать id сообщения посетителя как ключ своего ответа.

## RPC

Все функции: `SECURITY DEFINER`, `search_path = public, pg_temp`.

| Функция | Кто может вызывать |
|---|---|
| `chat_get_or_create_session`, `chat_send_message`, `chat_list_messages` | только `authenticated` (у `public` и `anon` отозвано) |
| `chat_add_response` | только `service_role` |
| служебные `_chat_*` | никто из клиентских ролей |

### `chat_get_or_create_session(p_client_key uuid) returns uuid`

```ts
const clientKey = localStorage.getItem('chat_client_key') ?? crypto.randomUUID()
localStorage.setItem('chat_client_key', clientKey)
const { data: sessionId } = await supabase.rpc('chat_get_or_create_session', { p_client_key: clientKey })
// sessionId: string (uuid)
```

- Владелец — `auth.uid()`.
- Повторный вызов с тем же ключом тем же пользователем возвращает тот же `session_id` (идемпотентно).
- Тот же `client_key` у другого пользователя создаёт **его собственный**, отдельный диалог: доступа к чужому диалогу это не даёт.
- Ошибки: `not_authenticated`; `invalid_client_key` (hint `client_key`), если ключ `null`.

### `chat_send_message(p_session_id uuid, p_client_message_id uuid, p_body text) returns uuid`

```ts
const { data: messageId } = await supabase.rpc('chat_send_message', {
  p_session_id: sessionId, p_client_message_id: crypto.randomUUID(), p_body: text,
})
```

- Только владелец диалога. `sender` всегда `visitor`, клиент его не передаёт.
- Текст обрезается по краям, длина 1–4000.
- **Повтор с тем же `client_message_id`** возвращает id существующего сообщения: дубль не создаётся, текст не меняется. При сетевой ошибке повторяйте с тем же `client_message_id`.
- После нового сообщения обновляются `updated_at` и `last_message_at` диалога.
- Ошибки:
  - `not_authenticated`;
  - `session_not_found` (`session_id`) — нет такого диалога;
  - `forbidden` (`session_id`) — чужой диалог;
  - `invalid_message` (`client_message_id`) — не передан ключ;
  - `invalid_message` (`body`) — пустой текст или длиннее 4000 символов.

### `chat_list_messages(p_session_id uuid, p_limit integer default 100, p_before timestamptz default null)`

Возвращает `{ id, session_id, sender, body, client_message_id, created_at }[]`.

```ts
const { data } = await supabase.rpc('chat_list_messages', { p_session_id: sessionId, p_limit: 50 })
// более старые:
const { data: older } = await supabase.rpc('chat_list_messages', {
  p_session_id: sessionId, p_limit: 50, p_before: data[0].created_at,
})
```

- Только владелец. Лимит 1–200.
- Без `p_before` — последние `p_limit` сообщений; с `p_before` — последние среди сообщений строго раньше `p_before`.
- Результат всегда в хронологическом порядке: от старых к новым, при равном времени по `id`.
- Ошибки: `not_authenticated`, `session_not_found`, `forbidden` (чужой диалог — ошибка, а не пустая история), `invalid_limit` (`limit`).

### `chat_add_response(p_session_id uuid, p_client_message_id uuid, p_body text) returns uuid`

Только для внешней серверной системы с ключом `service_role`.

- `sender` всегда `responder`. Текст: trim, 1–4000 символов. Диалог должен существовать.
- Повтор с тем же `client_message_id` возвращает существующий ответ, дубля нет.
- Обновляет `updated_at` и `last_message_at`.
- Вызов из браузера (`anon`/`authenticated`) отклоняется базой: ошибка прав, код `42501`. Кроме того, функция сама проверяет, что роль JWT — `service_role`, и иначе возвращает `forbidden`.
- Ошибки: `session_not_found` (`session_id`), `invalid_message` (`client_message_id` / `body`), `forbidden`.

Пример серверной записи ответа (Node.js, ключ только в серверном окружении):

```ts
import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.CHAT_SUPABASE_URL!, process.env.CHAT_SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const { data: responseId, error } = await admin.rpc('chat_add_response', {
  p_session_id: sessionId,
  p_client_message_id: visitorMessage.client_message_id, // или свой стабильный uuid ответа
  p_body: answerText, // текст формирует внешняя система; генерация не входит в эту задачу
})
```

Или через REST:

```bash
curl -X POST "$CHAT_SUPABASE_URL/rest/v1/rpc/chat_add_response" \
  -H "apikey: $CHAT_SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $CHAT_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_session_id":"<uuid>","p_client_message_id":"<uuid>","p_body":"Текст ответа"}'
```

## Ошибки

SQLSTATE `P0001`:
- `error.message` — код;
- `error.hint` — поле (`client_key`, `session_id`, `client_message_id`, `body`, `limit`) или пусто;
- `error.details` — короткий текст по-русски.

Коды: `not_authenticated`, `forbidden`, `session_not_found`, `invalid_client_key`, `invalid_message`, `invalid_limit`. Внутренний SQL наружу не отдаётся.

Ошибки прав самой базы (вызов без входа, прямой INSERT/UPDATE/DELETE) приходят с кодом `42501` — показывать как «нет доступа».

## RLS и права

- RLS включён на `chat_sessions` и `chat_messages`.
- **`chat_sessions`:** `authenticated` читает только строки с `visitor_user_id = auth.uid()`.
- **`chat_messages`:** `authenticated` читает только сообщения своих диалогов.
- **`anon`:** нет никаких прав на таблицы и RPC чата.
- **`authenticated`:** только `SELECT` (по RLS); `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` отозваны. Сообщения посетителя пишутся только через `chat_send_message`, ответы — только через `chat_add_response`.
- Редактировать и удалять сообщения через клиентский API нельзя.

## Realtime

`public.chat_messages` добавлена в публикацию `supabase_realtime` (миграция идемпотентна). `chat_sessions` в Realtime не добавлена.

```ts
const channel = supabase
  .channel(`chat:${sessionId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
      (payload) => addMessage(payload.new))
  .subscribe()
```

- Realtime применяет RLS: посетитель получает только сообщения своего диалога.
- Подписываться нужно **после** `signInAnonymously()`, чтобы канал работал с токеном посетителя.
- В канал приходят и ответы `responder`, и собственные сообщения посетителя: склеивайте по `id` или по `client_message_id`, чтобы не показать сообщение дважды.
- После переподключения дочитывайте пропущенное через `chat_list_messages`.

## Переменные окружения

| Переменная | Где | Значение |
|---|---|---|
| `CHAT_SUPABASE_URL` (или `VITE_`/`NEXT_PUBLIC_` вариант) | фронтенд и сервер | `https://twnzsfsyrdnkjbkxpynl.supabase.co` |
| `CHAT_SUPABASE_PUBLISHABLE_KEY` (или anon key) | фронтенд | Dashboard → Project Settings → API Keys |
| `CHAT_SUPABASE_SERVICE_ROLE_KEY` | **только сервер** внешней системы | Dashboard → Project Settings → API Keys |

> **`service_role` нельзя использовать в браузере** и класть в код фронтенда, переменные с префиксом `VITE_`/`NEXT_PUBLIC_`, репозиторий сайта или архивы. Этот ключ обходит RLS.

Клиент чата создаётся отдельно от клиента Apex:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './chat.database.types'
export const chat = createClient<Database>(import.meta.env.VITE_CHAT_SUPABASE_URL, import.meta.env.VITE_CHAT_SUPABASE_PUBLISHABLE_KEY)
```

Типы проекта Chat — в `src/lib/chat.database.types.ts`. Они не заменяют типы Apex. В типах есть служебные `_chat_*` и `chat_add_response` — с фронта их не вызывать.

## Порядок работы виджета

1. `signInAnonymously()`, если сессии нет.
2. `chat_get_or_create_session(client_key)`, где `client_key` хранится в `localStorage`.
3. `chat_list_messages(session_id)` — загрузить историю.
4. Подписаться на Realtime с фильтром `session_id=eq.<id>`.
5. Отправлять сообщения через `chat_send_message` с новым `client_message_id`; при ошибке сети повторять с тем же ключом.

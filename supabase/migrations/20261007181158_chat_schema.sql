-- Простой чат сайта: диалоги, сообщения, RPC, RLS, Realtime. Проект Chat (twnzsfsyrdnkjbkxpynl).

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_user_id uuid not null references auth.users(id) on delete cascade,
  client_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz null,
  constraint chat_sessions_visitor_client_key_key unique (visitor_user_id, client_key)
);
create index if not exists chat_sessions_last_message_idx on public.chat_sessions (last_message_at desc nulls last);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender text not null,
  body text not null,
  client_message_id uuid not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_sender_check check (sender in ('visitor', 'responder')),
  constraint chat_messages_body_check check (char_length(btrim(body)) between 1 and 4000),
  constraint chat_messages_dedup_key unique (session_id, sender, client_message_id)
);
create index if not exists chat_messages_session_created_idx on public.chat_messages (session_id, created_at, id);

-- RLS: только чтение своего; записи только через функции
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy visitor_reads_own_sessions on public.chat_sessions
  for select to authenticated using (visitor_user_id = auth.uid());

create policy visitor_reads_own_messages on public.chat_messages
  for select to authenticated using (
    exists (select 1 from public.chat_sessions s where s.id = chat_messages.session_id and s.visitor_user_id = auth.uid()));

-- Ошибки: SQLSTATE P0001, message = код, hint = поле
create or replace function public._chat_err(p_code text, p_field text default null)
returns void language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception using errcode = 'P0001', message = p_code, hint = coalesce(p_field, ''),
    detail = case p_code
      when 'not_authenticated' then 'Нужно войти'
      when 'forbidden' then 'Нет доступа к этому диалогу'
      when 'session_not_found' then 'Диалог не найден'
      when 'invalid_client_key' then 'Не указан ключ диалога'
      when 'invalid_message' then 'Сообщение должно содержать от 1 до 4000 символов'
      when 'invalid_limit' then 'Лимит должен быть от 1 до 200'
      else p_code end;
end $$;

-- 5. Создание или восстановление диалога
create or replace function public.chat_get_or_create_session(p_client_key uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then perform _chat_err('not_authenticated'); end if;
  if p_client_key is null then perform _chat_err('invalid_client_key', 'client_key'); end if;
  insert into chat_sessions (visitor_user_id, client_key) values (v_uid, p_client_key)
  on conflict (visitor_user_id, client_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from chat_sessions where visitor_user_id = v_uid and client_key = p_client_key;
  end if;
  return v_id;
end $$;

-- проверка владельца диалога (общая для отправки и чтения)
create or replace function public._chat_require_owner(p_session_id uuid)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_owner uuid;
begin
  if auth.uid() is null then perform _chat_err('not_authenticated'); end if;
  if p_session_id is null then perform _chat_err('session_not_found', 'session_id'); end if;
  select visitor_user_id into v_owner from chat_sessions where id = p_session_id;
  if v_owner is null then perform _chat_err('session_not_found', 'session_id'); end if;
  if v_owner <> auth.uid() then perform _chat_err('forbidden', 'session_id'); end if;
end $$;

-- запись сообщения (общая): идемпотентно по (session_id, sender, client_message_id)
create or replace function public._chat_insert_message(p_session_id uuid, p_sender text, p_client_message_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_body text := btrim(coalesce(p_body, '')); v_id uuid;
begin
  if p_client_message_id is null then perform _chat_err('invalid_message', 'client_message_id'); end if;
  select id into v_id from chat_messages
   where session_id = p_session_id and sender = p_sender and client_message_id = p_client_message_id;
  if v_id is not null then return v_id; end if;
  if char_length(v_body) not between 1 and 4000 then perform _chat_err('invalid_message', 'body'); end if;
  insert into chat_messages (session_id, sender, body, client_message_id)
  values (p_session_id, p_sender, v_body, p_client_message_id)
  on conflict (session_id, sender, client_message_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from chat_messages
     where session_id = p_session_id and sender = p_sender and client_message_id = p_client_message_id;
    return v_id;
  end if;
  update chat_sessions set updated_at = now(), last_message_at = now() where id = p_session_id;
  return v_id;
end $$;

-- 6. Сообщение посетителя
create or replace function public.chat_send_message(p_session_id uuid, p_client_message_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform _chat_require_owner(p_session_id);
  return _chat_insert_message(p_session_id, 'visitor', p_client_message_id, p_body);
end $$;

-- 7. История
create or replace function public.chat_list_messages(p_session_id uuid, p_limit integer default 100, p_before timestamptz default null)
returns table (id uuid, session_id uuid, sender text, body text, client_message_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform _chat_require_owner(p_session_id);
  if p_limit is null or p_limit < 1 or p_limit > 200 then perform _chat_err('invalid_limit', 'limit'); end if;
  return query
  select m.id, m.session_id, m.sender, m.body, m.client_message_id, m.created_at
    from (select * from chat_messages x
           where x.session_id = p_session_id and (p_before is null or x.created_at < p_before)
           order by x.created_at desc, x.id desc
           limit p_limit) m
   order by m.created_at, m.id;
end $$;

-- 8. Ответ внешней системы (только service_role)
create or replace function public.chat_add_response(p_session_id uuid, p_client_message_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- защита в глубину: кроме прав EXECUTE, вызов из браузера (роль JWT не service_role) запрещён
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    perform _chat_err('forbidden');
  end if;
  if p_session_id is null or not exists (select 1 from chat_sessions where id = p_session_id) then
    perform _chat_err('session_not_found', 'session_id');
  end if;
  return _chat_insert_message(p_session_id, 'responder', p_client_message_id, p_body);
end $$;

grant execute on function public.chat_get_or_create_session(uuid) to authenticated;
grant execute on function public.chat_send_message(uuid, uuid, text) to authenticated;
grant execute on function public.chat_list_messages(uuid, integer, timestamptz) to authenticated;
grant execute on function public.chat_add_response(uuid, uuid, text) to service_role;
grant select on public.chat_sessions, public.chat_messages to authenticated;

-- 10. Realtime (идемпотентно)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

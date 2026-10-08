-- created_at сообщения = точное время вставки (clock_timestamp), чтобы порядок истории был строгим
-- даже для нескольких сообщений в одной транзакции.
create or replace function public._chat_insert_message(p_session_id uuid, p_sender text, p_client_message_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_body text := btrim(coalesce(p_body, '')); v_id uuid; v_now timestamptz := clock_timestamp();
begin
  if p_client_message_id is null then perform _chat_err('invalid_message', 'client_message_id'); end if;
  select id into v_id from chat_messages
   where session_id = p_session_id and sender = p_sender and client_message_id = p_client_message_id;
  if v_id is not null then return v_id; end if;
  if char_length(v_body) not between 1 and 4000 then perform _chat_err('invalid_message', 'body'); end if;
  insert into chat_messages (session_id, sender, body, client_message_id, created_at)
  values (p_session_id, p_sender, v_body, p_client_message_id, v_now)
  on conflict (session_id, sender, client_message_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from chat_messages
     where session_id = p_session_id and sender = p_sender and client_message_id = p_client_message_id;
    return v_id;
  end if;
  update chat_sessions set updated_at = v_now, last_message_at = v_now where id = p_session_id;
  return v_id;
end $$;
revoke execute on function public._chat_insert_message(uuid, text, uuid, text) from public, anon, authenticated;

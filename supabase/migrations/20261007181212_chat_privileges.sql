-- Права: клиент только читает (по RLS) и вызывает три RPC; ответ — только service_role.
revoke all on public.chat_sessions, public.chat_messages from anon;
revoke insert, update, delete, truncate, references, trigger on public.chat_sessions, public.chat_messages from authenticated;

revoke execute on function public.chat_get_or_create_session(uuid) from public, anon;
revoke execute on function public.chat_send_message(uuid, uuid, text) from public, anon;
revoke execute on function public.chat_list_messages(uuid, integer, timestamptz) from public, anon;
revoke execute on function public.chat_add_response(uuid, uuid, text) from public, anon, authenticated;

revoke execute on function public._chat_err(text, text) from public, anon, authenticated;
revoke execute on function public._chat_require_owner(uuid) from public, anon, authenticated;
revoke execute on function public._chat_insert_message(uuid, text, uuid, text) from public, anon, authenticated;

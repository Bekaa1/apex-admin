create or replace function public.admin_create_store_request(
  p_request_key uuid, p_name text, p_city text default null, p_address text default null,
  p_timezone text default 'Asia/Almaty', p_partner_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_owner uuid;
begin
  if v_uid is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not is_apex_admin() then perform _store_err('forbidden', null, 'Только для администратора'); end if;
  if p_request_key is null then perform _store_err('invalid_store', 'request_key', 'Нужен request_key'); end if;

  select id, created_by into v_id, v_owner from store_onboarding_requests where request_key = p_request_key;
  if v_id is not null then
    if v_owner <> v_uid then perform _store_err('forbidden', 'request_key', 'Ключ запроса уже использован'); end if;
    return v_id;
  end if;

  perform _store_validate_fields(p_name, p_city, p_address, coalesce(p_timezone, 'Asia/Almaty'), p_partner_id, false);
  insert into store_onboarding_requests (request_key, created_by, name, city, address, timezone, partner_id)
  values (p_request_key, v_uid, btrim(p_name), nullif(btrim(p_city), ''), nullif(btrim(p_address), ''),
          coalesce(p_timezone, 'Asia/Almaty'), p_partner_id)
  on conflict (request_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id, created_by into v_id, v_owner from store_onboarding_requests where request_key = p_request_key;
    if v_owner <> v_uid then perform _store_err('forbidden', 'request_key', 'Ключ запроса уже использован'); end if;
    return v_id;
  end if;
  perform _store_audit('store_request.created', 'store_onboarding_request', v_id, jsonb_build_object('status', 'inactive'));
  return v_id;
end $$;

create or replace function public.admin_update_store_request(
  p_id uuid, p_expected_revision bigint, p_name text, p_city text, p_address text,
  p_timezone text default 'Asia/Almaty', p_partner_id uuid default null)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare r store_onboarding_requests%rowtype;
begin
  r := _store_request_lock_draft(p_id, p_expected_revision);
  perform _store_validate_fields(p_name, p_city, p_address, coalesce(p_timezone, 'Asia/Almaty'), p_partner_id, false);
  update store_onboarding_requests
     set name = btrim(p_name), city = nullif(btrim(p_city), ''), address = nullif(btrim(p_address), ''),
         timezone = coalesce(p_timezone, 'Asia/Almaty'), partner_id = p_partner_id,
         revision = revision + 1, updated_at = now()
   where id = p_id
  returning revision into r.revision;
  return r.revision;
end $$;

create or replace function public.admin_save_store_plan(
  p_id uuid, p_expected_revision bigint, p_plan jsonb, p_source_file_name text default null)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare r store_onboarding_requests%rowtype;
begin
  r := _store_request_lock_draft(p_id, p_expected_revision);
  perform _store_plan_validate(p_plan);
  if p_source_file_name is not null and char_length(p_source_file_name) > 255 then
    perform _store_err('invalid_plan', 'source_file_name', 'Имя файла до 255 символов');
  end if;
  insert into store_onboarding_plans (request_id, format_version, width, height, source_file_name, plan_data)
  values (p_id, (p_plan->>'version')::int, (p_plan->>'width')::numeric, (p_plan->>'height')::numeric,
          nullif(btrim(p_source_file_name), ''), p_plan)
  on conflict (request_id) do update
     set format_version = excluded.format_version, width = excluded.width, height = excluded.height,
         source_file_name = excluded.source_file_name, plan_data = excluded.plan_data, updated_at = now();
  update store_onboarding_requests set revision = revision + 1, updated_at = now()
   where id = p_id returning revision into r.revision;
  return r.revision;
end $$;

create or replace function public.admin_submit_store_request(p_id uuid, p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare r store_onboarding_requests%rowtype; v_plan jsonb;
begin
  r := _store_request_lock_draft(p_id, p_expected_revision);
  perform _store_validate_fields(r.name, r.city, r.address, r.timezone, r.partner_id, true);
  select plan_data into v_plan from store_onboarding_plans where request_id = p_id;
  if v_plan is null then perform _store_err('invalid_plan', 'plan', 'Загрузите план магазина'); end if;
  perform _store_plan_validate(v_plan);
  perform _store_request_check_zoning(p_id, v_plan);
  update store_onboarding_requests
     set status = 'pending_owner_approval', submitted_at = now(), revision = revision + 1, updated_at = now()
   where id = p_id returning revision into r.revision;
  perform _store_audit('store_request.submitted', 'store_onboarding_request', p_id,
                       jsonb_build_object('status', 'pending_owner_approval', 'revision', r.revision));
  return r.revision;
end $$;

create or replace function public.owner_approve_store_request(p_id uuid, p_expected_revision bigint)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); r store_onboarding_requests%rowtype; p store_onboarding_plans%rowtype;
  z record; v_zone uuid; v_plan_id uuid; v_map jsonb := '{}'; v_zones int := 0; v_assign int;
begin
  if v_uid is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not _store_owner_configured() then
    perform _store_err('owner_not_configured', null, 'Владелец Apex не настроен');
  end if;
  if not is_apex_store_owner() then perform _store_err('forbidden', null, 'Одобрять может только владелец Apex'); end if;

  select * into r from store_onboarding_requests where id = p_id for update;
  if not found then perform _store_err('not_found', null, 'Заявка не найдена'); end if;

  if r.status = 'approved' then
    if r.published_store_id is not null
       and exists (select 1 from stores where id = r.published_store_id and onboarding_request_id = r.id) then
      return r.published_store_id;
    end if;
    perform _store_err('already_published', null, 'Заявка уже одобрена');
  end if;
  if r.status <> 'pending_owner_approval' then
    perform _store_err('invalid_status', 'status', 'Одобрить можно только заявку, ожидающую владельца');
  end if;
  if p_expected_revision is distinct from r.revision then
    perform _store_err('revision_conflict', 'revision', 'Заявку уже изменили, обновите страницу');
  end if;
  if exists (select 1 from stores where id = r.proposed_store_id or onboarding_request_id = r.id) then
    perform _store_err('already_published', null, 'Магазин по этой заявке уже существует');
  end if;

  -- повторная полная проверка
  perform _store_validate_fields(r.name, r.city, r.address, r.timezone, r.partner_id, true);
  select * into p from store_onboarding_plans where request_id = p_id;
  if not found then perform _store_err('invalid_plan', 'plan', 'У заявки нет плана'); end if;
  perform _store_plan_validate(p.plan_data);
  perform _store_request_check_zoning(p_id, p.plan_data);

  -- публикация: всё в одной транзакции вызова, любая ошибка откатывает всё
  insert into stores (id, name, address, city, timezone, partner_id, onboarding_request_id, approved_at, approved_by)
  values (r.proposed_store_id, r.name, r.address, r.city, r.timezone, r.partner_id, r.id, now(), v_uid);

  insert into store_plans (store_id, onboarding_request_id, format_version, width, height, source_file_name,
                           plan_data, created_by, approved_by)
  values (r.proposed_store_id, r.id, p.format_version, p.width, p.height, p.source_file_name, p.plan_data, r.created_by, v_uid)
  returning id into v_plan_id;

  for z in select * from store_onboarding_zones where request_id = p_id order by sort_order, name loop
    -- UUID зоны из черновика, если он свободен в zones; иначе новый
    v_zone := case when exists (select 1 from zones where id = z.id) then gen_random_uuid() else z.id end;
    insert into zones (id, store_id, name, description, onboarding_request_id)
    values (v_zone, r.proposed_store_id, z.name, z.description, r.id);
    insert into store_plan_zone_styles (plan_id, zone_id, color, sort_order) values (v_plan_id, v_zone, z.color, z.sort_order);
    v_map := v_map || jsonb_build_object(z.id::text, v_zone);
    v_zones := v_zones + 1;
  end loop;

  insert into store_plan_zone_assignments (plan_id, element_id, zone_id)
  select v_plan_id, a.element_id, (v_map->>(a.zone_id::text))::uuid
    from store_onboarding_assignments a where a.request_id = p_id;
  get diagnostics v_assign = row_count;

  update store_onboarding_requests
     set status = 'approved', reviewed_by = v_uid, reviewed_at = now(), published_store_id = r.proposed_store_id,
         revision = revision + 1, updated_at = now()
   where id = p_id;

  perform _store_audit('store_request.approved', 'store', r.proposed_store_id,
    jsonb_build_object('request_id', r.id, 'plan_id', v_plan_id, 'zones', v_zones, 'assignments', v_assign));
  return r.proposed_store_id;
end $$;

create or replace function public.owner_reject_store_request(p_id uuid, p_expected_revision bigint, p_comment text)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r store_onboarding_requests%rowtype;
begin
  if v_uid is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not _store_owner_configured() then
    perform _store_err('owner_not_configured', null, 'Владелец Apex не настроен');
  end if;
  if not is_apex_store_owner() then perform _store_err('forbidden', null, 'Отклонять может только владелец Apex'); end if;
  if p_comment is null or char_length(btrim(p_comment)) not between 3 and 1000 then
    perform _store_err('invalid_store', 'comment', 'Комментарий обязателен: от 3 до 1000 символов');
  end if;
  select * into r from store_onboarding_requests where id = p_id for update;
  if not found then perform _store_err('not_found', null, 'Заявка не найдена'); end if;
  if r.status <> 'pending_owner_approval' then
    perform _store_err('invalid_status', 'status', 'Отклонить можно только заявку, ожидающую владельца');
  end if;
  if p_expected_revision is distinct from r.revision then
    perform _store_err('revision_conflict', 'revision', 'Заявку уже изменили, обновите страницу');
  end if;
  update store_onboarding_requests
     set status = 'rejected', reviewed_by = v_uid, reviewed_at = now(), review_comment = btrim(p_comment),
         revision = revision + 1, updated_at = now()
   where id = p_id returning revision into r.revision;
  perform _store_audit('store_request.rejected', 'store_onboarding_request', p_id,
                       jsonb_build_object('status', 'rejected', 'revision', r.revision));
  return r.revision;
end $$;

-- Чтение
create or replace function public.admin_list_store_requests(p_status text default null)
returns table (id uuid, status text, revision bigint, name text, city text, address text, timezone text,
               partner_id uuid, proposed_store_id uuid, published_store_id uuid, submitted_at timestamptz,
               reviewed_at timestamptz, review_comment text, created_at timestamptz, updated_at timestamptz,
               zone_count integer, has_plan boolean, is_mine boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not (is_apex_admin() or is_apex_store_owner()) then perform _store_err('forbidden', null, 'Нет доступа'); end if;
  return query
  select r.id, r.status, r.revision, r.name, r.city, r.address, r.timezone, r.partner_id, r.proposed_store_id,
         r.published_store_id, r.submitted_at, r.reviewed_at, r.review_comment, r.created_at, r.updated_at,
         (select count(*)::int from store_onboarding_zones z where z.request_id = r.id),
         exists (select 1 from store_onboarding_plans pl where pl.request_id = r.id),
         r.created_by = auth.uid()
    from store_onboarding_requests r
   where p_status is null or r.status = p_status
   order by r.updated_at desc;
end $$;

create or replace function public.owner_list_pending_store_requests()
returns table (id uuid, status text, revision bigint, name text, city text, address text, timezone text,
               partner_id uuid, proposed_store_id uuid, published_store_id uuid, submitted_at timestamptz,
               reviewed_at timestamptz, review_comment text, created_at timestamptz, updated_at timestamptz,
               zone_count integer, has_plan boolean, is_mine boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not _store_owner_configured() then perform _store_err('owner_not_configured', null, 'Владелец Apex не настроен'); end if;
  if not is_apex_store_owner() then perform _store_err('forbidden', null, 'Только для владельца Apex'); end if;
  return query
  select r.id, r.status, r.revision, r.name, r.city, r.address, r.timezone, r.partner_id, r.proposed_store_id,
         r.published_store_id, r.submitted_at, r.reviewed_at, r.review_comment, r.created_at, r.updated_at,
         (select count(*)::int from store_onboarding_zones z where z.request_id = r.id),
         exists (select 1 from store_onboarding_plans pl where pl.request_id = r.id),
         r.created_by = auth.uid()
    from store_onboarding_requests r
   where r.status = 'pending_owner_approval'
   order by r.submitted_at;
end $$;

create or replace function public.get_store_request(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r store_onboarding_requests%rowtype;
begin
  if auth.uid() is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not (is_apex_admin() or is_apex_store_owner()) then perform _store_err('forbidden', null, 'Нет доступа'); end if;
  select * into r from store_onboarding_requests where id = p_id;
  if not found then perform _store_err('not_found', null, 'Заявка не найдена'); end if;
  return jsonb_build_object(
    'request', jsonb_build_object('id', r.id, 'status', r.status, 'revision', r.revision, 'name', r.name,
       'city', r.city, 'address', r.address, 'timezone', r.timezone, 'partner_id', r.partner_id,
       'proposed_store_id', r.proposed_store_id, 'published_store_id', r.published_store_id,
       'submitted_at', r.submitted_at, 'reviewed_at', r.reviewed_at, 'review_comment', r.review_comment,
       'created_at', r.created_at, 'updated_at', r.updated_at, 'is_mine', r.created_by = auth.uid()),
    'plan', (select jsonb_build_object('format_version', p.format_version, 'width', p.width, 'height', p.height,
               'source_file_name', p.source_file_name, 'plan_data', p.plan_data, 'updated_at', p.updated_at)
               from store_onboarding_plans p where p.request_id = r.id),
    'zones', coalesce((select jsonb_agg(jsonb_build_object('id', z.id, 'client_id', z.client_id, 'name', z.name,
               'description', z.description, 'color', z.color, 'sort_order', z.sort_order) order by z.sort_order, z.name)
               from store_onboarding_zones z where z.request_id = r.id), '[]'),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('element_id', a.element_id, 'zone_id', a.zone_id) order by a.element_id)
               from store_onboarding_assignments a where a.request_id = r.id), '[]'));
end $$;

create or replace function public.get_store_plan(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p store_plans%rowtype;
begin
  if auth.uid() is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not (is_apex_admin() or is_apex_store_owner()) then perform _store_err('forbidden', null, 'Нет доступа'); end if;
  select * into p from store_plans where store_id = p_store_id;
  if not found then perform _store_err('not_found', null, 'У магазина нет опубликованного плана'); end if;
  return jsonb_build_object(
    'plan', jsonb_build_object('id', p.id, 'store_id', p.store_id, 'onboarding_request_id', p.onboarding_request_id,
       'format_version', p.format_version, 'width', p.width, 'height', p.height,
       'source_file_name', p.source_file_name, 'plan_data', p.plan_data, 'created_at', p.created_at),
    'zones', coalesce((select jsonb_agg(jsonb_build_object('zone_id', s.zone_id, 'name', z.name, 'color', s.color,
               'sort_order', s.sort_order) order by s.sort_order, z.name)
               from store_plan_zone_styles s join zones z on z.id = s.zone_id where s.plan_id = p.id), '[]'),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('element_id', a.element_id, 'zone_id', a.zone_id) order by a.element_id)
               from store_plan_zone_assignments a where a.plan_id = p.id), '[]'));
end $$;

grant execute on function public.is_apex_store_owner() to authenticated;
grant execute on function public.admin_create_store_request(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_update_store_request(uuid, bigint, text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_save_store_plan(uuid, bigint, jsonb, text) to authenticated;
grant execute on function public.admin_submit_store_request(uuid, bigint) to authenticated;
grant execute on function public.owner_approve_store_request(uuid, bigint) to authenticated;
grant execute on function public.owner_reject_store_request(uuid, bigint, text) to authenticated;
grant execute on function public.admin_list_store_requests(text) to authenticated;
grant execute on function public.owner_list_pending_store_requests() to authenticated;
grant execute on function public.get_store_request(uuid) to authenticated;
grant execute on function public.get_store_plan(uuid) to authenticated;
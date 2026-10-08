-- Заявки магазинов, часть 2 — ОСНОВНАЯ база (Apex). Запустить целиком в SQL Editor.
-- 1) admin_replace_store_zoning: заменяет зоны и назначения ТОЛЬКО внутри черновика заявки
--    (удаляет строки store_onboarding_zones / store_onboarding_assignments этой заявки; stores и zones не трогает).
-- 2) Закрывает новые функции от public/anon и прямую запись в новые таблицы из браузера.
-- Существующие объекты не меняются.

create or replace function public.admin_replace_store_zoning(
  p_id uuid, p_expected_revision bigint, p_zones jsonb, p_assignments jsonb)
returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r store_onboarding_requests%rowtype; v_plan jsonb; z jsonb; a jsonb; n int := 0;
  v_cids text[] := '{}'; v_names text[] := '{}'; v_elems text[] := '{}'; v_cid text; v_name text; v_el text;
begin
  r := _store_request_lock_draft(p_id, p_expected_revision);
  select plan_data into v_plan from store_onboarding_plans where request_id = p_id;
  if v_plan is null then perform _store_err('invalid_plan', 'plan', 'Сначала сохраните план'); end if;

  -- зоны: [{client_id, name, description?, color, sort_order?}], от 1 до 200
  if jsonb_typeof(p_zones) is distinct from 'array' or jsonb_array_length(p_zones) not between 1 and 200 then
    perform _store_err('invalid_zones', 'zones', 'Нужно от 1 до 200 зон');
  end if;
  for z in select x from jsonb_array_elements(p_zones) x loop
    n := n + 1;
    v_cid := case when jsonb_typeof(z->'client_id') = 'string' then z->>'client_id' end;
    v_name := btrim(case when jsonb_typeof(z->'name') = 'string' then z->>'name' end);
    if v_cid is null or v_cid !~ '^[A-Za-z0-9_.:-]{1,64}$' then
      perform _store_err('invalid_zones', 'zones.client_id', format('Зона %s: недопустимый client_id', n));
    end if;
    if v_cid = any (v_cids) then
      perform _store_err('invalid_zones', 'zones.client_id', format('Повторяется client_id %s', v_cid));
    end if;
    if v_name is null or char_length(v_name) not between 1 and 80 then
      perform _store_err('invalid_zones', 'zones.name', format('Зона %s: название от 1 до 80 символов', n));
    end if;
    if lower(v_name) = any (v_names) then
      perform _store_err('invalid_zones', 'zones.name', format('Повторяется название зоны «%s»', v_name));
    end if;
    if jsonb_typeof(z->'color') is distinct from 'string' or (z->>'color') !~ '^#[0-9A-Fa-f]{6}$' then
      perform _store_err('invalid_zones', 'zones.color', format('Зона «%s»: цвет в формате #RRGGBB', v_name));
    end if;
    if z ? 'description' and jsonb_typeof(z->'description') not in ('string', 'null') then
      perform _store_err('invalid_zones', 'zones.description', format('Зона «%s»: описание — строка', v_name));
    end if;
    if char_length(coalesce(z->>'description', '')) > 300 then
      perform _store_err('invalid_zones', 'zones.description', format('Зона «%s»: описание до 300 символов', v_name));
    end if;
    if z ? 'sort_order' and jsonb_typeof(z->'sort_order') not in ('number', 'null') then
      perform _store_err('invalid_zones', 'zones.sort_order', format('Зона «%s»: sort_order — число', v_name));
    end if;
    v_cids := v_cids || v_cid; v_names := v_names || lower(v_name);
  end loop;

  -- назначения: [{element_id, zone_client_id}]; одна секция — максимум одна зона
  if jsonb_typeof(p_assignments) is distinct from 'array' then
    perform _store_err('invalid_assignments', 'assignments', 'assignments должен быть массивом');
  end if;
  for a in select x from jsonb_array_elements(p_assignments) x loop
    v_el := case when jsonb_typeof(a->'element_id') = 'string' then a->>'element_id' end;
    if v_el is null or not exists (select 1 from jsonb_array_elements(v_plan->'elements') e where e->>'id' = v_el) then
      perform _store_err('invalid_assignments', 'assignments.element_id', format('Секции %s нет в плане', coalesce(v_el, '?')));
    end if;
    if v_el = any (v_elems) then
      perform _store_err('invalid_assignments', 'assignments.element_id', format('Секция %s назначена больше чем одной зоне', v_el));
    end if;
    if not ((a->>'zone_client_id') = any (v_cids)) then
      perform _store_err('invalid_assignments', 'assignments.zone_client_id', format('Секция %s: зона не из этой заявки', v_el));
    end if;
    v_elems := v_elems || v_el;
  end loop;
  if exists (select 1 from unnest(v_cids) c
             where not exists (select 1 from jsonb_array_elements(p_assignments) x where x->>'zone_client_id' = c)) then
    perform _store_err('invalid_zones', 'zones', 'У каждой зоны должна быть хотя бы одна секция плана');
  end if;

  -- замена только внутри черновика (назначения удаляются каскадом)
  delete from store_onboarding_zones where request_id = p_id;
  insert into store_onboarding_zones (request_id, client_id, name, description, color, sort_order)
  select p_id, x->>'client_id', btrim(x->>'name'), nullif(btrim(x->>'description'), ''), upper(x->>'color'),
         coalesce((x->>'sort_order')::int, (ord - 1)::int)
    from jsonb_array_elements(p_zones) with ordinality t(x, ord);
  insert into store_onboarding_assignments (request_id, element_id, zone_id)
  select p_id, x->>'element_id', z.id
    from jsonb_array_elements(p_assignments) x
    join store_onboarding_zones z on z.request_id = p_id and z.client_id = x->>'zone_client_id';

  update store_onboarding_requests set revision = revision + 1, updated_at = now()
   where id = p_id returning revision into r.revision;
  return r.revision;
end $$;

-- Функции записи и чтения: только authenticated
revoke all on function public.admin_replace_store_zoning(uuid, bigint, jsonb, jsonb) from public, anon;
grant execute on function public.admin_replace_store_zoning(uuid, bigint, jsonb, jsonb) to authenticated;
revoke all on function public.is_apex_store_owner() from public, anon;
revoke all on function public.admin_create_store_request(uuid, text, text, text, text, uuid) from public, anon;
revoke all on function public.admin_update_store_request(uuid, bigint, text, text, text, text, uuid) from public, anon;
revoke all on function public.admin_save_store_plan(uuid, bigint, jsonb, text) from public, anon;
revoke all on function public.admin_submit_store_request(uuid, bigint) from public, anon;
revoke all on function public.owner_approve_store_request(uuid, bigint) from public, anon;
revoke all on function public.owner_reject_store_request(uuid, bigint, text) from public, anon;
revoke all on function public.admin_list_store_requests(text) from public, anon;
revoke all on function public.owner_list_pending_store_requests() from public, anon;
revoke all on function public.get_store_request(uuid) from public, anon;
revoke all on function public.get_store_plan(uuid) from public, anon;

-- Приватные помощники: недоступны из браузера
revoke all on function public._store_owner_configured() from public, anon, authenticated;
revoke all on function public._store_err(text, text, text) from public, anon, authenticated;
revoke all on function public._store_plan_kinds() from public, anon, authenticated;
revoke all on function public._store_plan_validate(jsonb) from public, anon, authenticated;
revoke all on function public._store_request_check_zoning(uuid, jsonb) from public, anon, authenticated;
revoke all on function public._store_request_lock_draft(uuid, bigint) from public, anon, authenticated;
revoke all on function public._store_validate_fields(text, text, text, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public._store_audit(text, text, uuid, jsonb) from public, anon, authenticated;
-- _can_read_store_request нужен политикам RLS для authenticated
revoke all on function public._can_read_store_request(uuid) from public, anon;

-- Новые таблицы: из браузера только чтение (и то по RLS), запись — только через функции
revoke all on public.apex_store_owners, public.store_onboarding_requests, public.store_onboarding_plans,
  public.store_onboarding_zones, public.store_onboarding_assignments, public.store_plans,
  public.store_plan_zone_styles, public.store_plan_zone_assignments from anon;
revoke insert, update, delete, truncate, references, trigger on public.apex_store_owners, public.store_onboarding_requests,
  public.store_onboarding_plans, public.store_onboarding_zones, public.store_onboarding_assignments, public.store_plans,
  public.store_plan_zone_styles, public.store_plan_zone_assignments from authenticated;

select 'ok' as result;

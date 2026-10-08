-- Заявки на новый магазин с одобрением владельца Apex. Только новые объекты и nullable-столбцы.

create table public.apex_store_owners (
  user_id uuid primary key references auth.users(id),
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table public.store_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  proposed_store_id uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  status text not null default 'inactive',
  revision bigint not null default 1,
  name text null,
  city text null,
  address text null,
  timezone text not null default 'Asia/Almaty',
  partner_id uuid null references public.partners(id),
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id),
  review_comment text null,
  published_store_id uuid null references public.stores(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_onboarding_requests_status_check
    check (status in ('inactive', 'pending_owner_approval', 'approved', 'rejected')),
  constraint store_onboarding_requests_revision_check check (revision >= 1)
);
create index store_onboarding_requests_status_idx on public.store_onboarding_requests (status, updated_at desc);
create index store_onboarding_requests_created_by_idx on public.store_onboarding_requests (created_by);

create table public.store_onboarding_plans (
  request_id uuid primary key references public.store_onboarding_requests(id) on delete cascade,
  format_version integer not null,
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  source_file_name text null,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_onboarding_zones (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.store_onboarding_requests(id) on delete cascade,
  client_id text not null,
  name text not null,
  description text null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_onboarding_zones_request_id_id_key unique (request_id, id),
  constraint store_onboarding_zones_client_id_key unique (request_id, client_id),
  constraint store_onboarding_zones_color_check check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint store_onboarding_zones_name_check check (btrim(name) <> '')
);
create unique index store_onboarding_zones_name_ci_key on public.store_onboarding_zones (request_id, lower(btrim(name)));

create table public.store_onboarding_assignments (
  request_id uuid not null,
  element_id text not null,
  zone_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (request_id, element_id),
  constraint store_onboarding_assignments_zone_fkey foreign key (request_id, zone_id)
    references public.store_onboarding_zones (request_id, id) on delete cascade
);
create index store_onboarding_assignments_zone_idx on public.store_onboarding_assignments (request_id, zone_id);

create table public.store_plans (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  onboarding_request_id uuid not null unique references public.store_onboarding_requests(id),
  format_version integer not null,
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  source_file_name text null,
  plan_data jsonb not null,
  created_by uuid not null references auth.users(id),
  approved_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_plan_zone_styles (
  plan_id uuid not null references public.store_plans(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null,
  primary key (plan_id, zone_id)
);

create table public.store_plan_zone_assignments (
  plan_id uuid not null references public.store_plans(id) on delete cascade,
  element_id text not null,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (plan_id, element_id)
);
create index store_plan_zone_assignments_zone_idx on public.store_plan_zone_assignments (zone_id);

-- Новые nullable-столбцы; существующие строки остаются с NULL.
alter table public.stores add column if not exists onboarding_request_id uuid null;
alter table public.stores add column if not exists approved_at timestamptz null;
alter table public.stores add column if not exists approved_by uuid null;
alter table public.stores add constraint stores_onboarding_request_id_fkey
  foreign key (onboarding_request_id) references public.store_onboarding_requests(id);
alter table public.stores add constraint stores_onboarding_request_id_key unique (onboarding_request_id);
alter table public.stores add constraint stores_approved_by_fkey
  foreign key (approved_by) references auth.users(id);

alter table public.zones add column if not exists onboarding_request_id uuid null;
alter table public.zones add constraint zones_onboarding_request_id_fkey
  foreign key (onboarding_request_id) references public.store_onboarding_requests(id);
create index zones_onboarding_request_id_idx on public.zones (onboarding_request_id) where onboarding_request_id is not null;

-- Проверки доступа
create or replace function public.is_apex_store_owner()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null
     and exists (select 1 from public.apex_store_owners o where o.user_id = auth.uid());
$$;

create or replace function public._store_owner_configured()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.apex_store_owners);
$$;

create or replace function public._can_read_store_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and (
    public.is_apex_admin() or public.is_apex_store_owner()
    or exists (select 1 from public.store_onboarding_requests r
               where r.id = p_request_id and r.created_by = auth.uid()));
$$;

-- RLS: только чтение; запись только через RPC (политик на запись нет).
alter table public.apex_store_owners enable row level security;
alter table public.store_onboarding_requests enable row level security;
alter table public.store_onboarding_plans enable row level security;
alter table public.store_onboarding_zones enable row level security;
alter table public.store_onboarding_assignments enable row level security;
alter table public.store_plans enable row level security;
alter table public.store_plan_zone_styles enable row level security;
alter table public.store_plan_zone_assignments enable row level security;

create policy owner_reads_own_owner_row on public.apex_store_owners
  for select to authenticated using (user_id = auth.uid());
create policy staff_reads_store_requests on public.store_onboarding_requests
  for select to authenticated using (public.is_apex_admin() or public.is_apex_store_owner() or created_by = auth.uid());
create policy staff_reads_store_onboarding_plans on public.store_onboarding_plans
  for select to authenticated using (public._can_read_store_request(request_id));
create policy staff_reads_store_onboarding_zones on public.store_onboarding_zones
  for select to authenticated using (public._can_read_store_request(request_id));
create policy staff_reads_store_onboarding_assignments on public.store_onboarding_assignments
  for select to authenticated using (public._can_read_store_request(request_id));
create policy staff_reads_store_plans on public.store_plans
  for select to authenticated using (public.is_apex_admin() or public.is_apex_store_owner());
create policy staff_reads_store_plan_zone_styles on public.store_plan_zone_styles
  for select to authenticated using (public.is_apex_admin() or public.is_apex_store_owner());
create policy staff_reads_store_plan_zone_assignments on public.store_plan_zone_assignments
  for select to authenticated using (public.is_apex_admin() or public.is_apex_store_owner());

-- Ошибки: SQLSTATE P0001, message = код, hint = поле, detail = текст для показа.
create or replace function public._store_err(p_code text, p_field text default null, p_detail text default null)
returns void language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception using errcode = 'P0001', message = p_code,
    hint = coalesce(p_field, ''), detail = coalesce(p_detail, p_code);
end $$;

-- Допустимые kind назначаемых элементов плана.
create or replace function public._store_plan_kinds()
returns text[] language sql immutable set search_path = public, pg_temp as $$
  select array['shelf','rack','wall_shelf','island','fridge','freezer','display','counter',
               'checkout','pallet','section','promo','entrance','other']::text[];
$$;

-- Валидация плана. Лимиты: JSON ≤ 512 КБ, элементов ≤ 1000, декораций ≤ 2000,
-- ширина/высота 0 < x ≤ 100000, id элемента ^[A-Za-z0-9_.:-]{1,64}$, label ≤ 120, category ≤ 60.
create or replace function public._store_plan_validate(p jsonb)
returns void language plpgsql stable set search_path = public, pg_temp as $$
declare
  w numeric; h numeric; e jsonb; n int := 0; v_id text; v_ids text[] := '{}';
  ex numeric; ey numeric; ew numeric; eh numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    perform _store_err('invalid_plan', 'plan', 'План должен быть JSON-объектом');
  end if;
  if octet_length(p::text) > 524288 then
    perform _store_err('plan_too_large', 'plan', 'План больше 512 КБ');
  end if;
  if jsonb_typeof(p->'version') <> 'number' or (p->>'version')::numeric <> 1 then
    perform _store_err('invalid_plan', 'version', 'Поддерживается только version = 1');
  end if;
  if jsonb_typeof(p->'width') <> 'number' or jsonb_typeof(p->'height') <> 'number' then
    perform _store_err('invalid_plan', 'width', 'width и height должны быть числами');
  end if;
  w := (p->>'width')::numeric; h := (p->>'height')::numeric;
  if w <= 0 or h <= 0 or w > 100000 or h > 100000 then
    perform _store_err('invalid_plan', 'width', 'width и height должны быть от 0 до 100000');
  end if;
  if jsonb_typeof(p->'elements') is distinct from 'array' then
    perform _store_err('invalid_plan', 'elements', 'elements должен быть массивом');
  end if;
  if jsonb_typeof(p->'decorations') is distinct from 'array' then
    perform _store_err('invalid_plan', 'decorations', 'decorations должен быть массивом');
  end if;
  if jsonb_typeof(p->'metadata') is distinct from 'object' then
    perform _store_err('invalid_plan', 'metadata', 'metadata должен быть объектом');
  end if;
  if jsonb_array_length(p->'elements') > 1000 then
    perform _store_err('too_many_elements', 'elements', 'Не больше 1000 элементов');
  end if;
  if jsonb_array_length(p->'decorations') > 2000 then
    perform _store_err('too_many_elements', 'decorations', 'Не больше 2000 декоративных элементов');
  end if;
  if jsonb_array_length(p->'elements') = 0 then
    perform _store_err('invalid_plan', 'elements', 'Нужен хотя бы один назначаемый элемент');
  end if;

  -- HTML / JavaScript в любых строках плана запрещены
  if exists (
    select 1 from jsonb_path_query(p, 'strict $.**') s
    where jsonb_typeof(s) = 'string'
      and (s #>> '{}') ~* '(<\s*/?\s*[a-z!?]|javascript\s*:|vbscript\s*:|data\s*:\s*text/html|\mon[a-z]+\s*=)'
  ) then
    perform _store_err('invalid_plan', 'plan', 'План не может содержать HTML или JavaScript');
  end if;

  for e in select x from jsonb_array_elements(p->'elements') x loop
    n := n + 1;
    if jsonb_typeof(e) <> 'object' then
      perform _store_err('invalid_plan', 'elements', format('Элемент %s не объект', n));
    end if;
    v_id := case when jsonb_typeof(e->'id') = 'string' then e->>'id' end;
    if v_id is null or v_id !~ '^[A-Za-z0-9_.:-]{1,64}$' then
      perform _store_err('invalid_plan', 'elements.id', format('Элемент %s: недопустимый id', n));
    end if;
    if v_id = any (v_ids) then
      perform _store_err('duplicate_element', 'elements.id', format('Повторяется id элемента %s', v_id));
    end if;
    v_ids := v_ids || v_id;
    if jsonb_typeof(e->'kind') <> 'string' or not ((e->>'kind') = any (_store_plan_kinds())) then
      perform _store_err('invalid_plan', 'elements.kind', format('Элемент %s: недопустимый kind', v_id));
    end if;
    if jsonb_typeof(e->'x') <> 'number' or jsonb_typeof(e->'y') <> 'number'
       or jsonb_typeof(e->'width') <> 'number' or jsonb_typeof(e->'height') <> 'number' then
      perform _store_err('invalid_plan', 'elements.x', format('Элемент %s: координаты и размеры должны быть числами', v_id));
    end if;
    ex := (e->>'x')::numeric; ey := (e->>'y')::numeric; ew := (e->>'width')::numeric; eh := (e->>'height')::numeric;
    if ew <= 0 or eh <= 0 then
      perform _store_err('invalid_plan', 'elements.width', format('Элемент %s: размеры должны быть больше 0', v_id));
    end if;
    if ex < 0 or ey < 0 or ex + ew > w or ey + eh > h then
      perform _store_err('invalid_plan', 'elements.x', format('Элемент %s выходит за границы плана', v_id));
    end if;
    if jsonb_typeof(e->'label') is distinct from 'string' or char_length(e->>'label') > 120 then
      perform _store_err('invalid_plan', 'elements.label', format('Элемент %s: label — строка до 120 символов', v_id));
    end if;
    if e ? 'category' and jsonb_typeof(e->'category') <> 'null'
       and (jsonb_typeof(e->'category') <> 'string' or char_length(e->>'category') > 60) then
      perform _store_err('invalid_plan', 'elements.category', format('Элемент %s: category — строка до 60 символов', v_id));
    end if;
  end loop;
end $$;

-- Проверка зон и назначений черновика против плана.
create or replace function public._store_request_check_zoning(p_request_id uuid, p_plan jsonb)
returns void language plpgsql stable set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from store_onboarding_zones where request_id = p_request_id) then
    perform _store_err('invalid_zones', 'zones', 'Нужна хотя бы одна зона');
  end if;
  if exists (select 1 from store_onboarding_zones z where z.request_id = p_request_id
             and not exists (select 1 from store_onboarding_assignments a
                             where a.request_id = p_request_id and a.zone_id = z.id)) then
    perform _store_err('invalid_zones', 'zones', 'У каждой зоны должна быть хотя бы одна секция плана');
  end if;
  if exists (select 1 from store_onboarding_assignments a where a.request_id = p_request_id
             and not exists (select 1 from jsonb_array_elements(p_plan->'elements') e where e->>'id' = a.element_id)) then
    perform _store_err('invalid_assignments', 'assignments', 'Есть назначения на секции, которых нет в плане');
  end if;
end $$;

-- Блокировка и проверки черновика для изменений автором-админом.
create or replace function public._store_request_lock_draft(p_id uuid, p_expected_revision bigint)
returns public.store_onboarding_requests language plpgsql security definer set search_path = public, pg_temp as $$
declare r store_onboarding_requests%rowtype;
begin
  if auth.uid() is null then perform _store_err('not_authenticated', null, 'Нужно войти'); end if;
  if not is_apex_admin() then perform _store_err('forbidden', null, 'Только для администратора'); end if;
  select * into r from store_onboarding_requests where id = p_id for update;
  if not found then perform _store_err('not_found', null, 'Заявка не найдена'); end if;
  if r.created_by <> auth.uid() then perform _store_err('forbidden', null, 'Изменять заявку может только её автор'); end if;
  if r.status not in ('inactive', 'rejected') then
    perform _store_err('invalid_status', 'status', 'Изменять можно только заявку в статусе inactive или rejected');
  end if;
  if p_expected_revision is distinct from r.revision then
    perform _store_err('revision_conflict', 'revision', 'Заявку уже изменили, обновите страницу');
  end if;
  return r;
end $$;

create or replace function public._store_validate_fields(p_name text, p_city text, p_address text, p_timezone text, p_partner_id uuid, p_require_all boolean)
returns void language plpgsql stable set search_path = public, pg_temp as $$
begin
  if p_name is null or char_length(btrim(p_name)) not between 2 and 120 then
    perform _store_err('invalid_store', 'name', 'Название: от 2 до 120 символов');
  end if;
  if (p_require_all and (p_city is null or btrim(p_city) = '')) or char_length(btrim(coalesce(p_city, ''))) > 80 then
    perform _store_err('invalid_store', 'city', 'Город обязателен, до 80 символов');
  end if;
  if (p_require_all and (p_address is null or btrim(p_address) = '')) or char_length(btrim(coalesce(p_address, ''))) > 200 then
    perform _store_err('invalid_store', 'address', 'Адрес обязателен, до 200 символов');
  end if;
  if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then
    perform _store_err('invalid_store', 'timezone', 'Неизвестный часовой пояс');
  end if;
  if p_partner_id is not null and not exists (select 1 from partners where id = p_partner_id) then
    perform _store_err('invalid_store', 'partner_id', 'Партнёр не найден');
  end if;
end $$;

create or replace function public._store_audit(p_action text, p_entity_type text, p_entity_id uuid, p_after jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into audit_log (actor_user_id, action, entity_type, entity_id, after)
  values ((select id from users where id = auth.uid()), p_action, p_entity_type, p_entity_id, p_after);
end $$;
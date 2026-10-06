-- Keep private profile fields out of anonymous reads and allow profile completion
-- only for the authenticated user created by the signup trigger.
begin;

alter table public.users enable row level security;

do $migration$
declare
  existing_policy record;
  policy_count integer;
begin
  select count(*)
  into policy_count
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename = 'users';

  if policy_count <> 4 then
    raise exception 'Expected 4 existing policies on public.users, found %', policy_count;
  end if;

  for existing_policy in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', existing_policy.policyname);
  end loop;
end;
$migration$;

revoke all on table public.users from public, anon, authenticated;
grant select on table public.users to authenticated;

create policy users_select_own_profile
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.complete_signup_profile(
  p_full_name text,
  p_bin text,
  p_company_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(btrim(p_full_name), '') is null
    or nullif(btrim(p_bin), '') is null
    or nullif(btrim(p_company_name), '') is null
  then
    raise exception 'Full name, BIN, and company name are required' using errcode = '22023';
  end if;

  update public.users
  set full_name = btrim(p_full_name),
      bin = btrim(p_bin),
      company_name = btrim(p_company_name),
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.complete_signup_profile(text, text, text) from public, anon, authenticated;
grant execute on function public.complete_signup_profile(text, text, text) to authenticated;

commit;

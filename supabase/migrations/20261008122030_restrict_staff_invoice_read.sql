-- Apex project only. Chat migrations in this repository target another project.
-- Apply this migration explicitly; do not blindly push the mixed migration folder.
-- Staff roles are additive: admin/owner satisfy has_role('accountant'); a client
-- retains access to their own invoices through advertiser_reads_own_invoices.
begin;

do $guard$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'advertiser_invoices' and c.relrowsecurity
  ) then
    raise exception 'advertiser_invoices must have RLS enabled';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advertiser_invoices'
      and policyname = 'staff_read_invoices' and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'Expected authenticated staff invoice SELECT policy is missing';
  end if;
end
$guard$;

alter policy staff_read_invoices on public.advertiser_invoices
  using ((select public.has_role('accountant')));

commit;

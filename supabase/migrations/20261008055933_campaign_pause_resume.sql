-- Advertiser pause and resume of a running campaign («Поставить на паузу» / «Возобновить» on the campaign card).
-- The player shows only `active` campaigns (select_ad_for_zone), so `paused` stops plays at once;
-- the notification trigger (_ntf_on_ad) already sends campaign_paused / campaign_resumed.
-- Existing functions are not changed: edit_campaign and extend_campaign still refuse a paused campaign.

alter table public.ads
  add column paused_at timestamptz,
  add column paused_by text,
  add constraint ads_paused_by_check check (paused_by is null or paused_by in ('advertiser', 'admin'));

-- When and by whom the campaign was paused; cleared when it leaves the pause.
-- pause_campaign() sets paused_by = 'advertiser'; any other change to `paused` (an admin's update) counts as 'admin'.
create function public._ads_pause_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status::text = 'paused' then
      new.paused_at := now();
      if new.paused_by is not distinct from old.paused_by then
        new.paused_by := 'admin';
      end if;
    else
      new.paused_at := null;
      new.paused_by := null;
    end if;
  end if;
  return new;
end $$;

create trigger trg_ads_pause_fields
  before update of status on public.ads
  for each row execute function public._ads_pause_fields();

-- active → paused. Errors come as a code in `message`, like the other campaign RPCs.
create function public.pause_campaign(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a ads%rowtype;
begin
  if v_uid is null then perform _campaign_err('not_authenticated', null, 'Нужно войти'); end if;
  select * into a from ads where id = p_id and user_id = v_uid for update;
  if not found then perform _campaign_err('not_found', null, 'Кампания не найдена'); end if;
  if a.status::text <> 'active' then
    perform _campaign_err('invalid_status', 'status', 'На паузу можно поставить только идущую кампанию');
  end if;
  update ads set status = 'paused', is_active = false, paused_by = 'advertiser' where id = a.id;
  return 'paused';
end $$;

-- paused → active, only a pause the advertiser made; without budget left the campaign goes to budget_ended.
create function public.resume_campaign(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a ads%rowtype;
  v_status text;
begin
  if v_uid is null then perform _campaign_err('not_authenticated', null, 'Нужно войти'); end if;
  select * into a from ads where id = p_id and user_id = v_uid for update;
  if not found then perform _campaign_err('not_found', null, 'Кампания не найдена'); end if;
  if a.status::text <> 'paused' or a.paused_by is distinct from 'advertiser' then
    perform _campaign_err('invalid_status', 'status', 'Возобновить можно только кампанию, которую вы сами поставили на паузу');
  end if;
  v_status := case when coalesce(a.budget, 0) > 0 and coalesce(a.spent_budget, 0) >= a.budget then 'budget_ended' else 'active' end;
  update ads set status = v_status::ad_status, is_active = (v_status = 'active') where id = a.id;
  return v_status;
end $$;

revoke all on function public.pause_campaign(uuid) from public, anon;
revoke all on function public.resume_campaign(uuid) from public, anon;
grant execute on function public.pause_campaign(uuid) to authenticated;
grant execute on function public.resume_campaign(uuid) to authenticated;

-- The same view with paused_at and paused_by appended at the end.
create or replace view public.my_campaigns_stats as
 SELECT a.id AS ad_id,
    a.title,
    a.name,
    a.status,
    a.status_label_ru,
    a.status_color,
    a.store_name,
    a.start_date,
    a.end_date,
    a.total_hours,
    a.used_hours,
    COALESCE(a.hours_used_pct, 0::numeric) AS hours_used_pct,
    a.budget,
    COALESCE(a.spent_budget, 0::numeric) AS spent_budget,
    GREATEST(COALESCE(a.budget, 0::numeric) - COALESCE(a.spent_budget, 0::numeric), 0::numeric) AS remaining_budget,
    COALESCE(a.budget_used_pct, 0::numeric) AS budget_used_pct,
    COALESCE(a.remaining_budget_pct, 100::numeric) AS remaining_budget_pct,
    a.created_at,
    ( SELECT count(*) AS count
           FROM ad_view_history avh
          WHERE avh.ad_id = a.id) AS total_plays,
    COALESCE(LEAST(GREATEST(a.used_hours / NULLIF(a.total_hours, 0::numeric), 0::numeric), 1::numeric), 0::numeric)::double precision AS hours_used_fraction,
    COALESCE(LEAST(GREATEST(a.spent_budget / NULLIF(a.budget, 0::numeric), 0::numeric), 1::numeric), 0::numeric)::double precision AS budget_used_fraction,
    t.code AS tariff_code,
    t.name AS tariff_name,
    a.price_per_play,
    a.description,
    a.submitted_at,
    ( SELECT count(*)::integer AS count
           FROM ad_stores st
          WHERE st.ad_id = a.id) AS store_count,
    ( SELECT count(*)::integer AS count
           FROM carts c
          WHERE (c.store_id IN ( SELECT st.store_id
                   FROM ad_stores st
                  WHERE st.ad_id = a.id))) AS cart_count,
    a.paid_amount,
    ( SELECT COALESCE(sum(i.amount), 0::numeric) AS "coalesce"
           FROM advertiser_invoices i
          WHERE i.ad_id = a.id AND i.status <> 'cancelled'::text) AS invoice_amount,
    ( SELECT COALESCE(sum(i.amount), 0::numeric) AS "coalesce"
           FROM advertiser_invoices i
          WHERE i.ad_id = a.id AND i.status = 'unpaid'::text) AS unpaid_amount,
    ( SELECT i.sent_to
           FROM advertiser_invoices i
          WHERE i.ad_id = a.id AND i.status <> 'cancelled'::text
          ORDER BY i.issued_at DESC
         LIMIT 1) AS invoice_sent_to,
    a.rejection_reasons,
    a.moderator_comment,
    a.moderated_at,
    a.video_url,
    a.content_url,
    a.video_duration_sec,
    t.version AS tariff_version,
    t.price_per_play AS tariff_current_price,
    t.min_amount AS tariff_min_amount,
    t.purchasable AND NOT t.is_archived AS tariff_can_extend,
    a.plays_count,
    COALESCE(t.can_select_zone, false) AS tariff_can_select_zone,
    ( SELECT count(DISTINCT pl.cart_id)::integer AS count
           FROM playback_logs pl
             JOIN carts c ON c.id = pl.cart_id
          WHERE pl.played_at > (now() - '01:00:00'::interval) AND (c.store_id IN ( SELECT st.store_id
                   FROM ad_stores st
                  WHERE st.ad_id = a.id))) AS online_cart_count,
    a.paused_at,
    a.paused_by
   FROM ads a
     LEFT JOIN tariffs t ON t.id = a.tariff_id
  WHERE a.user_id = auth.uid();

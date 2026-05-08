-- ────────────────────────────────────────────────────────────────────────────
-- Phase 2: Analytics — property_views + admin dashboard SQL views
-- ────────────────────────────────────────────────────────────────────────────

-- Per-view event log (one row per property detail page view)
create table if not exists public.property_views (
  id           bigserial primary key,
  property_id  uuid references public.properties(id) on delete cascade,
  area_id      uuid references public.areas(id) on delete set null,
  fingerprint  text,                                 -- anonymous device hash
  session_id   text,
  referrer     text,
  user_agent   text,
  country      text,
  viewed_at    timestamptz not null default now()
);

create index if not exists property_views_prop_idx on public.property_views(property_id, viewed_at desc);
create index if not exists property_views_area_idx on public.property_views(area_id, viewed_at desc);
create index if not exists property_views_time_idx on public.property_views(viewed_at desc);

alter table public.property_views enable row level security;

-- Anonymous insert allowed (analytics beacon from public site)
drop policy if exists "property_views_public_insert" on public.property_views;
create policy "property_views_public_insert" on public.property_views
  for insert with check (true);

-- Only admins read
drop policy if exists "property_views_auth_read" on public.property_views;
create policy "property_views_auth_read" on public.property_views
  for select using (auth.role() = 'authenticated');

-- ── Views (dashboards) ───────────────────────────────────────────────────────
-- 1. Most-viewed areas, last 30 days
create or replace view public.v_views_by_area_30d as
  select
    a.id   as area_id,
    a.name as area_name,
    a.slug as area_slug,
    count(*) as views
  from public.property_views pv
  join public.properties p on p.id = pv.property_id
  join public.areas a       on a.id = p.area_id
  where pv.viewed_at > now() - interval '30 days'
  group by a.id, a.name, a.slug
  order by views desc;

-- 2. Most-viewed property types, last 30 days
create or replace view public.v_views_by_type_30d as
  select
    p.type,
    count(*) as views
  from public.property_views pv
  join public.properties p on p.id = pv.property_id
  where pv.viewed_at > now() - interval '30 days'
  group by p.type
  order by views desc;

-- 3. Listings by status × listing_type
create or replace view public.v_listings_by_status as
  select
    listing_type,
    status,
    count(*) as count
  from public.properties
  group by listing_type, status
  order by listing_type, status;

-- 4. Leads per area, last 90 days, by day
create or replace view public.v_leads_daily_90d as
  select
    date_trunc('day', l.created_at)::date as day,
    a.name as area_name,
    a.slug as area_slug,
    count(*) as leads
  from public.leads l
  left join public.areas a on a.id = l.area_id
  where l.created_at > now() - interval '90 days'
  group by 1, a.name, a.slug
  order by 1;

-- 5. KPI: total leads, conversion rate, total views — last 30 days
create or replace view public.v_kpi_30d as
  with v as (
    select count(*) as total_views,
           count(distinct fingerprint) filter (where fingerprint is not null) as unique_visitors
    from public.property_views
    where viewed_at > now() - interval '30 days'
  ),
  l as (
    select count(*) as total_leads,
           count(*) filter (where status = 'converted') as converted_leads
    from public.leads
    where created_at > now() - interval '30 days'
  )
  select
    v.total_views,
    v.unique_visitors,
    l.total_leads,
    l.converted_leads,
    case when v.unique_visitors > 0
         then round(100.0 * l.total_leads / v.unique_visitors, 2)
         else 0 end as view_to_lead_rate_pct,
    case when l.total_leads > 0
         then round(100.0 * l.converted_leads / l.total_leads, 2)
         else 0 end as lead_to_conversion_rate_pct
  from v cross join l;

-- 6. Off-plan vs ready lead split, last 90 days
create or replace view public.v_leads_by_completion_90d as
  select
    coalesce(p.completion_status, 'unknown') as completion_status,
    count(*) as leads
  from public.leads l
  left join public.properties p on p.id = l.property_id
  where l.created_at > now() - interval '90 days'
  group by p.completion_status
  order by leads desc;

-- 7. Top properties by views, last 30 days
create or replace view public.v_top_properties_30d as
  select
    p.id, p.title, p.slug, p.listing_type, p.price, p.currency,
    a.name as area_name, a.slug as area_slug,
    count(pv.id) as views
  from public.property_views pv
  join public.properties p on p.id = pv.property_id
  left join public.areas a on a.id = p.area_id
  where pv.viewed_at > now() - interval '30 days'
  group by p.id, p.title, p.slug, p.listing_type, p.price, p.currency, a.name, a.slug
  order by views desc
  limit 10;

-- Grant select on views to anon + authenticated (RLS on underlying tables still applies)
grant select on public.v_views_by_area_30d        to authenticated;
grant select on public.v_views_by_type_30d        to authenticated;
grant select on public.v_listings_by_status       to authenticated;
grant select on public.v_leads_daily_90d          to authenticated;
grant select on public.v_kpi_30d                  to authenticated;
grant select on public.v_leads_by_completion_90d  to authenticated;
grant select on public.v_top_properties_30d       to authenticated;

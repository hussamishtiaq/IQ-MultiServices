-- Sales automation: agents + auto-assignment, lead follow-ups, viewing
-- bookings with reminders, and saved-search property alerts.

create extension if not exists pgcrypto;

-- ── Agents ──────────────────────────────────────────────────────────────────
create table if not exists public.agents (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text,
  phone            text,              -- E.164 digits
  brn              text,
  active           boolean not null default true,
  last_assigned_at timestamptz,
  created_at       timestamptz not null default now()
);
alter table public.agents enable row level security;
drop policy if exists agents_auth_all on public.agents;
create policy agents_auth_all on public.agents for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ── Leads: assignment, follow-up, link to messaging contact ─────────────────
alter table public.leads
  add column if not exists assigned_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists notes             text,
  add column if not exists contact_id        uuid references public.audience_contacts(id) on delete set null;

create index if not exists leads_follow_up_idx on public.leads(next_follow_up_at) where next_follow_up_at is not null;
create index if not exists leads_agent_idx     on public.leads(assigned_agent_id, created_at desc);

-- ── Viewings ────────────────────────────────────────────────────────────────
create table if not exists public.viewings (
  id                   uuid primary key default gen_random_uuid(),
  property_id          uuid references public.properties(id) on delete set null,
  lead_id              uuid references public.leads(id) on delete set null,
  agent_id             uuid references public.agents(id) on delete set null,
  contact_id           uuid references public.audience_contacts(id) on delete set null,
  name                 text not null,
  phone                text not null,
  email                text,
  scheduled_at         timestamptz not null,
  status               text not null default 'requested'
                         check (status in ('requested','confirmed','completed','cancelled','no_show')),
  notes                text,
  confirmation_sent_at timestamptz,
  reminder_sent_at     timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists viewings_when_idx on public.viewings(scheduled_at) where status in ('requested','confirmed');
-- One active booking per property per slot; one per agent per slot.
create unique index if not exists viewings_property_slot_uniq on public.viewings(property_id, scheduled_at) where status in ('requested','confirmed');
create unique index if not exists viewings_agent_slot_uniq    on public.viewings(agent_id, scheduled_at)    where status in ('requested','confirmed') and agent_id is not null;

alter table public.viewings enable row level security;
drop policy if exists viewings_auth_all on public.viewings;
create policy viewings_auth_all on public.viewings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ── Saved searches → new-listing alerts (explicit opt-in) ───────────────────
create table if not exists public.saved_searches (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.audience_contacts(id) on delete cascade,
  channel      text not null check (channel in ('email','whatsapp')),
  criteria     jsonb not null default '{}'::jsonb,  -- {listing_type, area_id, type, min_beds, max_price_aed}
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create table if not exists public.property_alerts_sent (
  search_id   uuid not null references public.saved_searches(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  sent_at     timestamptz not null default now(),
  primary key (search_id, property_id)
);

alter table public.saved_searches       enable row level security;
alter table public.property_alerts_sent enable row level security;
drop policy if exists saved_searches_auth_all on public.saved_searches;
create policy saved_searches_auth_all on public.saved_searches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists property_alerts_sent_auth_all on public.property_alerts_sent;
create policy property_alerts_sent_auth_all on public.property_alerts_sent for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

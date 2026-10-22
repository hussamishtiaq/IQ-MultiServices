-- Compliant bulk messaging: audience with consent tracking, global suppression
-- list, campaigns, and a unified two-way message log (email + WhatsApp).

create extension if not exists pgcrypto;

-- ── Audience ────────────────────────────────────────────────────────────────
create table if not exists public.audience_contacts (
  id                       uuid primary key default gen_random_uuid(),
  name                     text,
  company                  text,
  email                    text,
  phone                    text,          -- E.164 digits only, e.g. 971501234567
  contact_type             text not null default 'client'
                             check (contact_type in ('client','b2b','lead','other')),
  source                   text not null default 'manual'
                             check (source in ('lead_form','import','manual','inbound')),
  lead_id                  uuid references public.leads(id) on delete set null,
  tags                     text[] not null default '{}',
  email_consent            text not null default 'unknown'
                             check (email_consent in ('opted_in','implied','unknown','opted_out')),
  email_consent_at         timestamptz,
  email_consent_source     text,
  whatsapp_consent         text not null default 'unknown'
                             check (whatsapp_consent in ('opted_in','unknown','opted_out')),
  whatsapp_consent_at      timestamptz,
  whatsapp_consent_source  text,
  last_inbound_whatsapp_at timestamptz,   -- opens Meta's 24h customer-service window
  last_inbound_email_at    timestamptz,
  unsubscribe_token        uuid not null unique default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists audience_email_uniq on public.audience_contacts(lower(email)) where email is not null;
create unique index if not exists audience_phone_uniq on public.audience_contacts(phone) where phone is not null;
create index if not exists audience_tags_idx on public.audience_contacts using gin(tags);

-- ── Suppression list (checked before EVERY send, never bypassed) ────────────
create table if not exists public.suppressions (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null check (channel in ('email','whatsapp')),
  address    text not null,               -- lowercased email or E.164 digits
  reason     text not null check (reason in ('unsubscribed','hard_bounce','complaint','stop_keyword','manual','invalid','marketing_blocked')),
  detail     text,
  created_at timestamptz not null default now(),
  unique (channel, address)
);

-- ── Campaigns ───────────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  channel            text not null check (channel in ('email','whatsapp')),
  category           text not null default 'marketing' check (category in ('marketing','utility')),
  status             text not null default 'draft'
                       check (status in ('draft','sending','paused','completed','cancelled')),
  pause_reason       text,
  audience_filter    jsonb not null default '{}'::jsonb,   -- { tags?: string[], contact_types?: string[] }
  email_subject      text,
  email_html         text,
  email_text         text,
  wa_template_name   text,
  wa_template_lang   text default 'en',
  wa_template_params text[] not null default '{}',          -- e.g. {'{{name}}','{{company}}'}
  total_recipients   integer not null default 0,
  skipped_count      integer not null default 0,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  completed_at       timestamptz
);

-- ── Unified message log (outbound + inbound, both channels) ─────────────────
create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid references public.campaigns(id) on delete set null,
  contact_id          uuid references public.audience_contacts(id) on delete set null,
  channel             text not null check (channel in ('email','whatsapp')),
  direction           text not null check (direction in ('outbound','inbound')),
  category            text not null default 'utility' check (category in ('marketing','utility')),
  to_address          text not null,
  from_address        text,
  subject             text,
  body                text,
  template_name       text,
  status              text not null default 'queued'
                        check (status in ('queued','sent','delivered','read','failed','bounced','complained','skipped','received')),
  error               text,
  provider_message_id text,
  external_ref        text,               -- email Message-ID header, for reply threading
  created_at          timestamptz not null default now(),
  sent_at             timestamptz,
  delivered_at        timestamptz,
  read_at             timestamptz
);

create unique index if not exists messages_provider_id_uniq on public.messages(channel, provider_message_id) where provider_message_id is not null;
create index if not exists messages_queue_idx    on public.messages(channel, status, created_at) where status = 'queued';
create index if not exists messages_contact_idx  on public.messages(contact_id, created_at desc);
create index if not exists messages_campaign_idx on public.messages(campaign_id, status);
create index if not exists messages_sent_idx     on public.messages(channel, sent_at) where direction = 'outbound';

-- ── Health metrics read by the dispatcher's circuit breaker ─────────────────
create or replace view public.v_channel_health_7d with (security_invoker = true) as
select
  channel,
  count(*) filter (where status in ('sent','delivered','read','bounced','complained','failed')) as attempted,
  count(*) filter (where status = 'bounced')    as bounced,
  count(*) filter (where status = 'complained') as complained,
  count(*) filter (where status = 'failed')     as failed
from public.messages
where direction = 'outbound' and sent_at > now() - interval '7 days'
group by channel;

-- Meta's limit counts unique recipients per rolling 24h. Counted in SQL because
-- PostgREST caps row fetches (default 1000), which would undercount and overshoot the tier.
create or replace function public.whatsapp_unique_recipients_since(since timestamptz)
returns integer language sql stable security invoker as $$
  select count(distinct to_address)::int from public.messages
  where channel = 'whatsapp' and direction = 'outbound' and sent_at >= since
$$;

create or replace function public.campaign_status_counts(cid uuid)
returns table(status text, n integer) language sql stable security invoker as $$
  select status, count(*)::int from public.messages where campaign_id = cid group by status
$$;

-- ── RLS: admin-only. Webhooks/cron/unsubscribe use the service-role key. ────
alter table public.audience_contacts enable row level security;
alter table public.suppressions      enable row level security;
alter table public.campaigns         enable row level security;
alter table public.messages          enable row level security;

do $$
declare t text;
begin
  foreach t in array array['audience_contacts','suppressions','campaigns','messages'] loop
    execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
    execute format(
      'create policy %I on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t || '_auth_all', t);
  end loop;
end $$;

-- Keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_audience_touch on public.audience_contacts;
create trigger trg_audience_touch before update on public.audience_contacts
  for each row execute function public.touch_updated_at();

-- Business address for the mandatory email footer (CAN-SPAM / good practice)
insert into public.site_settings (key, value)
select 'business_postal_address', 'IQ MultiServices, Dubai, United Arab Emirates'
where not exists (select 1 from public.site_settings where key = 'business_postal_address');

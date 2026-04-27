-- ============================================================
--  IQ MultiServices — Supabase Schema
--  Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Tables ──────────────────────────────────────────────────

create table if not exists properties (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  description text,
  price       numeric(12, 2),
  currency    text not null default 'AED'
                check (currency in ('USD', 'AED')),
  location    text,
  type        text not null default 'apartment'
                check (type in ('apartment','villa','commercial','land','office')),
  bedrooms    integer,
  bathrooms   integer,
  area        numeric(10, 2),
  status      text not null default 'available'
                check (status in ('available','sold','rented')),
  images      text[]   not null default '{}',
  featured    boolean  not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists services (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  description text,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists contacts (
  id          uuid default uuid_generate_v4() primary key,
  platform    text not null,
  label       text not null,
  value       text not null,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists site_settings (
  id    uuid default uuid_generate_v4() primary key,
  key   text unique not null,
  value text
);

-- ── Row-Level Security ────────────────────────────────────────

alter table properties   enable row level security;
alter table services     enable row level security;
alter table contacts     enable row level security;
alter table site_settings enable row level security;

-- Public can read everything
create policy "public_read_properties"    on properties    for select using (true);
create policy "public_read_services"      on services      for select using (true);
create policy "public_read_contacts"      on contacts      for select using (true);
create policy "public_read_site_settings" on site_settings for select using (true);

-- Only authenticated users (admin) can write
create policy "auth_all_properties"    on properties    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_services"      on services      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_contacts"      on contacts      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_site_settings" on site_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ── Default Settings ─────────────────────────────────────────

insert into site_settings (key, value) values
  ('site_name',  'IQ MultiServices'),
  ('tagline',    'Your Trusted Partner in Real Estate & Business Services'),
  ('about_text', 'We provide comprehensive real estate and business services to help you find the perfect property and grow your business.')
on conflict (key) do nothing;

-- ── Storage Bucket ───────────────────────────────────────────
-- Run these separately in the Supabase SQL editor:

/*
-- 1. Create the bucket
insert into storage.buckets (id, name, public)
  values ('property-images', 'property-images', true)
on conflict do nothing;

-- 2. Allow public reads
create policy "public_read_property_images"
  on storage.objects for select
  using ( bucket_id = 'property-images' );

-- 3. Allow authenticated uploads
create policy "auth_upload_property_images"
  on storage.objects for insert
  with check ( bucket_id = 'property-images' and auth.role() = 'authenticated' );

-- 4. Allow authenticated deletes
create policy "auth_delete_property_images"
  on storage.objects for delete
  using ( bucket_id = 'property-images' and auth.role() = 'authenticated' );
*/

-- ── Admin User ───────────────────────────────────────────────
-- Create your admin account via:
--   Supabase Dashboard > Authentication > Users > Invite User
-- Then use that email/password to log in at /admin/login

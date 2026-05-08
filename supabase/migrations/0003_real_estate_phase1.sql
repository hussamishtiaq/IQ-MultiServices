-- ────────────────────────────────────────────────────────────────────────────
-- Phase 1: Areas, Developers, Off-plan Projects, Leads
-- Extends `properties` with listing_type, completion_status, area, furnishing
-- ────────────────────────────────────────────────────────────────────────────

-- ── Areas (Dubai communities) ────────────────────────────────────────────────
create table if not exists public.areas (
  id              uuid default uuid_generate_v4() primary key,
  slug            text unique not null,
  name            text not null,
  city            text not null default 'Dubai',
  hero_image      text,
  gallery         text[] default '{}',
  description     text,
  amenities       text[] default '{}',
  avg_price_sale_aed   numeric(14,2),
  avg_price_rent_aed   numeric(14,2),
  avg_roi_pct          numeric(5,2),
  popular_unit_types   text[] default '{}',
  lat numeric(9,6),
  lng numeric(9,6),
  display_order   integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.areas enable row level security;

drop policy if exists "areas_public_read" on public.areas;
create policy "areas_public_read" on public.areas for select using (true);

drop policy if exists "areas_auth_write" on public.areas;
create policy "areas_auth_write" on public.areas for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Developers (Off-plan parents) ────────────────────────────────────────────
create table if not exists public.developers (
  id           uuid default uuid_generate_v4() primary key,
  slug         text unique not null,
  name         text not null,
  logo         text,
  description  text,
  website      text,
  display_order integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.developers enable row level security;

drop policy if exists "developers_public_read" on public.developers;
create policy "developers_public_read" on public.developers for select using (true);

drop policy if exists "developers_auth_write" on public.developers;
create policy "developers_auth_write" on public.developers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Off-plan Projects ────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                   uuid default uuid_generate_v4() primary key,
  slug                 text unique not null,
  name                 text not null,
  developer_id         uuid references public.developers(id) on delete restrict,
  area_id              uuid references public.areas(id),
  starting_price_aed   numeric(14,2),
  payment_plan         text,
  payment_plan_desc    text,
  handover_quarter     text,
  handover_date        date,
  status               text check (status in ('pre_launch','launched','under_construction','ready')) default 'launched',
  unit_types           text[] default '{}',
  hero_image           text,
  gallery              text[] default '{}',
  brochure_url         text,
  masterplan_url       text,
  amenities            text[] default '{}',
  description          text,
  featured             boolean not null default false,
  created_at           timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read" on public.projects for select using (true);

drop policy if exists "projects_auth_write" on public.projects;
create policy "projects_auth_write" on public.projects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Extend properties ────────────────────────────────────────────────────────
alter table public.properties
  add column if not exists area_id            uuid references public.areas(id),
  add column if not exists project_id         uuid references public.projects(id),
  add column if not exists listing_type       text not null default 'sale'
                            check (listing_type in ('sale','rent')),
  add column if not exists completion_status  text not null default 'ready'
                            check (completion_status in ('ready','off_plan','resale')),
  add column if not exists furnishing         text
                            check (furnishing in ('furnished','semi_furnished','unfurnished')),
  add column if not exists rent_period        text default 'yearly'
                            check (rent_period in ('yearly','monthly','weekly','daily')),
  add column if not exists payment_plan       text,
  add column if not exists handover_date      date,
  add column if not exists slug               text,
  add column if not exists views_count        integer not null default 0;

create index if not exists properties_area_idx           on public.properties(area_id);
create index if not exists properties_listing_type_idx   on public.properties(listing_type);
create index if not exists properties_completion_idx     on public.properties(completion_status);
create index if not exists properties_featured_idx       on public.properties(featured) where featured = true;
create unique index if not exists properties_slug_uniq   on public.properties(slug) where slug is not null;

-- ── Leads (contact form submissions) ─────────────────────────────────────────
create table if not exists public.leads (
  id                uuid default uuid_generate_v4() primary key,
  property_id       uuid references public.properties(id) on delete set null,
  project_id        uuid references public.projects(id) on delete set null,
  area_id           uuid references public.areas(id) on delete set null,
  source            text,
  name              text not null,
  email             text,
  phone             text not null,
  country_code      text default '+971',
  message           text,
  preferred_contact text check (preferred_contact in ('whatsapp','phone','email')) default 'whatsapp',
  status            text not null default 'new'
                      check (status in ('new','contacted','qualified','converted','lost')),
  ip_address        inet,
  user_agent        text,
  referrer          text,
  created_at        timestamptz not null default now()
);

create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
create index if not exists leads_area_idx           on public.leads(area_id, created_at desc);
create index if not exists leads_property_idx       on public.leads(property_id, created_at desc);

alter table public.leads enable row level security;

-- Anyone can insert a lead (lead capture from public site)
drop policy if exists "leads_public_insert" on public.leads;
create policy "leads_public_insert" on public.leads for insert with check (true);

-- Only authenticated users (admin) can read / update leads
drop policy if exists "leads_auth_read" on public.leads;
create policy "leads_auth_read" on public.leads for select using (auth.role() = 'authenticated');

drop policy if exists "leads_auth_update" on public.leads;
create policy "leads_auth_update" on public.leads for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Seed: 20 Dubai areas ─────────────────────────────────────────────────────
insert into public.areas (slug, name, description, popular_unit_types, display_order) values
  ('dubai-marina',          'Dubai Marina',          'Iconic waterfront community with high-rise apartments, restaurants, and a vibrant nightlife.',                  array['Studio','1BR','2BR','3BR'], 1),
  ('downtown-dubai',        'Downtown Dubai',        'Home of Burj Khalifa and Dubai Mall — premium central living with luxury apartments.',                          array['Studio','1BR','2BR','3BR','Penthouse'], 2),
  ('business-bay',          'Business Bay',          'Central business district with modern apartments along Dubai Water Canal.',                                      array['Studio','1BR','2BR','3BR'], 3),
  ('palm-jumeirah',         'Palm Jumeirah',         'Iconic palm-shaped island with luxury villas, beachfront apartments, and 5-star resorts.',                       array['Apartment','Villa','Penthouse'], 4),
  ('jumeirah-village-circle','Jumeirah Village Circle','Affordable family-friendly community known as JVC — apartments, townhouses, and parks.',                       array['Studio','1BR','2BR','3BR','Townhouse'], 5),
  ('jumeirah-lake-towers',  'Jumeirah Lake Towers',  'JLT — cluster of high-rises around four artificial lakes, popular with young professionals.',                    array['Studio','1BR','2BR','3BR'], 6),
  ('arabian-ranches',       'Arabian Ranches',       'Established gated villa community with golf course, schools, and community parks.',                              array['Villa','Townhouse'], 7),
  ('dubai-hills-estate',    'Dubai Hills Estate',    'Master-planned community with golf course, mall, and a mix of apartments, villas, townhouses.',                  array['Apartment','Villa','Townhouse'], 8),
  ('mirdif',                'Mirdif',                'Family-oriented suburban area with villas, townhouses, and Mirdif City Centre mall.',                            array['Villa','Townhouse','Apartment'], 9),
  ('dubai-creek-harbour',   'Dubai Creek Harbour',   'Waterfront destination with modern apartments and the future Dubai Creek Tower.',                                array['Studio','1BR','2BR','3BR'], 10),
  ('dubai-silicon-oasis',   'Dubai Silicon Oasis',   'Tech-focused free zone with affordable apartments and townhouses, popular with families.',                       array['Studio','1BR','2BR','Townhouse'], 11),
  ('al-barsha',             'Al Barsha',             'Centrally located residential area near Mall of the Emirates, mix of villas and apartments.',                    array['Apartment','Villa'], 12),
  ('jumeirah',              'Jumeirah',              'Beachfront prestigious district with private villas and low-rise apartments.',                                   array['Villa','Apartment'], 13),
  ('jumeirah-beach-residence','Jumeirah Beach Residence','JBR — beachfront apartment cluster with The Walk promenade.',                                                 array['Studio','1BR','2BR','3BR'], 14),
  ('al-furjan',             'Al Furjan',             'Residential community with a mix of villas, townhouses, and apartments near Discovery Gardens.',                  array['Villa','Townhouse','Apartment'], 15),
  ('damac-hills',           'DAMAC Hills',           'Gated golf community with villas, townhouses, and apartments around Trump International Golf Club.',              array['Villa','Townhouse','Apartment'], 16),
  ('motor-city',            'Motor City',            'Themed community with apartments and villas, home to Dubai Autodrome.',                                          array['Studio','1BR','2BR','Villa'], 17),
  ('dubai-sports-city',     'Dubai Sports City',     'Affordable apartments and villas near sports academies and stadiums.',                                           array['Studio','1BR','2BR','Villa'], 18),
  ('international-city',    'International City',    'Affordable themed clusters of low-rise apartments — entry-level investment area.',                                array['Studio','1BR','2BR'], 19),
  ('city-walk',             'City Walk',             'Upscale urban lifestyle district with low-rise apartments, boutiques, and restaurants.',                          array['Studio','1BR','2BR','3BR'], 20)
on conflict (slug) do nothing;

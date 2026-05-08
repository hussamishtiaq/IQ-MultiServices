-- Reviews on properties or areas. Moderated — only 'approved' rows shown publicly.

create table if not exists public.reviews (
  id            uuid default uuid_generate_v4() primary key,
  target_type   text not null check (target_type in ('property','area','agent')),
  target_id     uuid not null,
  rating        smallint not null check (rating between 1 and 5),
  title         text,
  body          text,
  reviewer_name  text,
  reviewer_email text,
  status        text not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);

create index if not exists reviews_target_idx on public.reviews(target_type, target_id, status);
create index if not exists reviews_status_idx on public.reviews(status, created_at desc);

alter table public.reviews enable row level security;

-- Anyone can submit a review (lands as 'pending')
drop policy if exists "reviews_public_insert" on public.reviews;
create policy "reviews_public_insert" on public.reviews
  for insert with check (status = 'pending');

-- Public can read APPROVED reviews only
drop policy if exists "reviews_public_read_approved" on public.reviews;
create policy "reviews_public_read_approved" on public.reviews
  for select using (status = 'approved');

-- Admins (authenticated) can read everything + update/delete
drop policy if exists "reviews_auth_read_all" on public.reviews;
create policy "reviews_auth_read_all" on public.reviews
  for select using (auth.role() = 'authenticated');

drop policy if exists "reviews_auth_update" on public.reviews;
create policy "reviews_auth_update" on public.reviews
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "reviews_auth_delete" on public.reviews;
create policy "reviews_auth_delete" on public.reviews
  for delete using (auth.role() = 'authenticated');

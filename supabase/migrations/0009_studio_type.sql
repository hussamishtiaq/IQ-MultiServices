-- Add studio_type to properties for sub-classification of studios (bedrooms = 0)
-- Values: standard | alcove | convertible | loft | micro

alter table public.properties
  add column if not exists studio_type text
    check (studio_type in ('standard', 'alcove', 'convertible', 'loft', 'micro'));

-- Index only on studio rows so it stays tiny
create index if not exists properties_studio_type_idx
  on public.properties(studio_type)
  where bedrooms = 0;

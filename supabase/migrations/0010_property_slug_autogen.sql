-- Auto-generate properties.slug from title, unique via short id suffix on collision.
-- Backfills existing rows and keeps new/edited rows slugged going forward.

create or replace function public.slugify(input text)
returns text language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  )
$$;

create or replace function public.properties_set_slug()
returns trigger language plpgsql as $$
declare
  base_slug text;
  candidate text;
  suffix int := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := public.slugify(new.title);
  if base_slug = '' then
    base_slug := 'property';
  end if;

  candidate := base_slug;
  while exists (
    select 1 from public.properties
    where slug = candidate and id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists trg_properties_set_slug on public.properties;
create trigger trg_properties_set_slug
  before insert or update of title on public.properties
  for each row execute function public.properties_set_slug();

-- Backfill existing rows (relies on trigger via a no-op title touch)
update public.properties set slug = null where slug is null;
update public.properties p set title = p.title where p.slug is null;

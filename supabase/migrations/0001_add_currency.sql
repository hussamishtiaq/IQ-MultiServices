-- Add currency column to properties.
-- Defaults to 'AED' (UAE market). Constrained to USD or AED for now.
alter table public.properties
  add column if not exists currency text not null default 'AED';

alter table public.properties
  drop constraint if exists properties_currency_check;

alter table public.properties
  add constraint properties_currency_check
  check (currency in ('USD', 'AED'));

-- Optional: add a default site-wide currency setting so the admin form can
-- pre-select the user's preferred currency on the new-property form.
insert into public.site_settings (key, value)
values ('default_currency', 'AED')
on conflict (key) do nothing;

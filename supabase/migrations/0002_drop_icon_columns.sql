-- Icons are derived from platform/type in the UI, not stored in the database.
alter table public.services
  drop column if exists icon;

alter table public.contacts
  drop column if exists icon;

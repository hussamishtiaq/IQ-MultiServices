-- RERA/DLD advertising compliance: every advertised listing needs a Trakheesi
-- permit number, and the responsible broker's BRN must be shown.
alter table public.properties
  add column if not exists permit_number text,
  add column if not exists agent_name    text,
  add column if not exists agent_brn     text;

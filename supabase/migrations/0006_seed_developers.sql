-- Seed top Dubai developers (idempotent on slug).
insert into public.developers (slug, name, description, website, display_order) values
  ('emaar',    'Emaar Properties', 'Master developer of Downtown Dubai, Dubai Marina, and Dubai Hills Estate.', 'https://www.emaar.com',                1),
  ('damac',    'DAMAC Properties', 'Luxury real estate developer behind DAMAC Hills, DAMAC Lagoons, and Damac Islands.', 'https://www.damacproperties.com', 2),
  ('sobha',    'Sobha Realty',     'Premium developer known for Sobha Hartland and meticulous backward integration.', 'https://www.sobharealty.com',     3),
  ('meraas',   'Meraas',           'Developer behind City Walk, Bluewaters, and La Mer.', 'https://www.meraas.com',                                       4),
  ('nakheel',  'Nakheel',          'Developer of Palm Jumeirah, Deira Islands, and The World.', 'https://www.nakheel.com',                                5),
  ('aldar',    'Aldar Properties', 'Abu Dhabi-based developer expanding into Dubai.', 'https://www.aldar.com',                                            6),
  ('select-group','Select Group',  'Boutique luxury developer with projects in Dubai Marina and JBR.', 'https://www.select-group.ae',                     7),
  ('binghatti','Binghatti',        'Local developer known for distinctive interlocking-balcony architecture.', 'https://binghatti.com',                   8)
on conflict (slug) do nothing;

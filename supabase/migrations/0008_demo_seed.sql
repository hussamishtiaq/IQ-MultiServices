-- ────────────────────────────────────────────────────────────────────────────
-- Demo seed data — realistic Dubai real estate listings, projects, reviews,
-- and leads so prospects can see a fully-populated platform.
-- Safe to re-run (idempotent via ON CONFLICT / WHERE NOT EXISTS).
-- ────────────────────────────────────────────────────────────────────────────

-- ── Update area pricing & hero images ────────────────────────────────────────
update public.areas set
  avg_price_sale_aed = 1850000,
  avg_price_rent_aed = 110000,
  avg_roi_pct = 6.8,
  hero_image = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800'
where slug = 'dubai-marina';

update public.areas set
  avg_price_sale_aed = 2650000,
  avg_price_rent_aed = 145000,
  avg_roi_pct = 5.9,
  hero_image = 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800'
where slug = 'downtown-dubai';

update public.areas set
  avg_price_sale_aed = 1420000,
  avg_price_rent_aed = 95000,
  avg_roi_pct = 7.1,
  hero_image = 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800'
where slug = 'business-bay';

update public.areas set
  avg_price_sale_aed = 4800000,
  avg_price_rent_aed = 290000,
  avg_roi_pct = 5.2,
  hero_image = 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800'
where slug = 'palm-jumeirah';

update public.areas set
  avg_price_sale_aed = 780000,
  avg_price_rent_aed = 58000,
  avg_roi_pct = 8.2,
  hero_image = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
where slug = 'jumeirah-village-circle';

update public.areas set
  avg_price_sale_aed = 1100000,
  avg_price_rent_aed = 78000,
  avg_roi_pct = 7.5,
  hero_image = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
where slug = 'jumeirah-lake-towers';

update public.areas set
  avg_price_sale_aed = 3200000,
  avg_price_rent_aed = 185000,
  avg_roi_pct = 5.8,
  hero_image = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
where slug = 'dubai-hills-estate';

update public.areas set
  avg_price_sale_aed = 2100000,
  avg_price_rent_aed = 165000,
  avg_roi_pct = 6.3,
  hero_image = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'
where slug = 'jumeirah-beach-residence';

update public.areas set
  avg_price_sale_aed = 1680000,
  avg_price_rent_aed = 105000,
  avg_roi_pct = 6.9,
  hero_image = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'
where slug = 'dubai-creek-harbour';

update public.areas set
  avg_price_sale_aed = 1950000,
  avg_price_rent_aed = 120000,
  avg_roi_pct = 6.4,
  hero_image = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800'
where slug = 'city-walk';

-- ── Off-plan Projects ─────────────────────────────────────────────────────────
insert into public.projects (
  slug, name, developer_id, area_id, starting_price_aed,
  payment_plan, payment_plan_desc, handover_quarter, status,
  unit_types, featured, description, amenities
)
select
  'creek-gate-towers', 'Creek Gate Towers',
  (select id from public.developers where slug = 'emaar'),
  (select id from public.areas where slug = 'dubai-creek-harbour'),
  1350000,
  '80/20', '80% during construction · 20% on handover',
  'Q4 2026', 'under_construction',
  array['Studio','1BR','2BR','3BR'],
  true,
  'Creek Gate Towers is a stunning waterfront development by Emaar offering panoramic views of Dubai Creek and the upcoming Creek Tower. Ideal for investors seeking strong rental yields in a fast-growing neighbourhood.',
  array['Infinity pool','Rooftop gym','Kids play area','Concierge','Covered parking','Direct creek access']
where not exists (select 1 from public.projects where slug = 'creek-gate-towers');

insert into public.projects (
  slug, name, developer_id, area_id, starting_price_aed,
  payment_plan, payment_plan_desc, handover_quarter, status,
  unit_types, featured, description, amenities
)
select
  'damac-lagoons-morocco', 'DAMAC Lagoons — Morocco',
  (select id from public.developers where slug = 'damac'),
  (select id from public.areas where slug = 'damac-hills'),
  1190000,
  '60/40', '60% during construction · 40% on handover',
  'Q2 2027', 'launched',
  array['Townhouse','Villa'],
  true,
  'Inspired by the vibrant city of Morocco, DAMAC Lagoons offers luxurious townhouses and villas set around crystal-clear lagoons with water-themed amenities. A resort-lifestyle community with world-class facilities.',
  array['Lagoon beach access','Water park','Floating cinema','Boat rides','Golf cart community','International school nearby']
where not exists (select 1 from public.projects where slug = 'damac-lagoons-morocco');

insert into public.projects (
  slug, name, developer_id, area_id, starting_price_aed,
  payment_plan, payment_plan_desc, handover_quarter, status,
  unit_types, featured, description, amenities
)
select
  'sobha-hartland-2-riverside', 'Sobha Hartland II — Riverside',
  (select id from public.developers where slug = 'sobha'),
  (select id from public.areas where slug = 'dubai-creek-harbour'),
  920000,
  '70/30', '70% during construction · 30% on handover',
  'Q3 2027', 'under_construction',
  array['1BR','2BR','3BR'],
  false,
  'Sobha Hartland II Riverside brings premium Sobha craftsmanship to a serene location flanked by the Dubai Water Canal. Single-row apartments with direct waterfront views, meticulously finished with marble and hardwood.',
  array['Canal-facing pool','Yoga deck','Co-working lounge','Smart home features','EV charging','Pet-friendly parks']
where not exists (select 1 from public.projects where slug = 'sobha-hartland-2-riverside');

insert into public.projects (
  slug, name, developer_id, area_id, starting_price_aed,
  payment_plan, payment_plan_desc, handover_quarter, status,
  unit_types, featured, description, amenities
)
select
  'city-walk-residences-3', 'City Walk Residences Phase 3',
  (select id from public.developers where slug = 'meraas'),
  (select id from public.areas where slug = 'city-walk'),
  2100000,
  '50/50', '50% during construction · 50% on handover',
  'Q1 2027', 'launched',
  array['1BR','2BR','3BR','Penthouse'],
  true,
  'The third phase of the award-winning City Walk Residences by Meraas. Low-rise boutique apartments in the heart of Dubai''s most stylish urban district, moments from premium retail, dining, and the beach.',
  array['Rooftop terrace','Pool with cabanas','Wellness spa','Direct mall access','Private cinema room','Concierge & valet']
where not exists (select 1 from public.projects where slug = 'city-walk-residences-3');

insert into public.projects (
  slug, name, developer_id, area_id, starting_price_aed,
  payment_plan, payment_plan_desc, handover_quarter, status,
  unit_types, featured, description, amenities
)
select
  'binghatti-hills', 'Binghatti Hills',
  (select id from public.developers where slug = 'binghatti'),
  (select id from public.areas where slug = 'dubai-hills-estate'),
  780000,
  '70/30', '70% during construction · 30% on handover',
  'Q4 2025', 'ready',
  array['Studio','1BR','2BR'],
  false,
  'Binghatti Hills is a striking residential tower featuring the brand''s signature interlocking-balcony facade. Competitively priced studios and apartments with golf course views, ready for immediate handover.',
  array['Golf course view','Temperature-controlled pool','Outdoor gym','Smart intercom','24/7 security','Retail podium']
where not exists (select 1 from public.projects where slug = 'binghatti-hills');

-- ── Demo Properties ───────────────────────────────────────────────────────────
-- 15 realistic listings across Dubai, mix of sale/rent, types, completion status

-- 1. Dubai Marina — 2BR Apartment for Sale (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  '2-Bedroom Sea View Apartment — Dubai Marina',
  'Stunning high-floor 2-bedroom apartment in one of Dubai Marina''s most sought-after towers. Floor-to-ceiling windows capture full marina and sea views. Features a modern open-plan kitchen, en-suite master bedroom, and a spacious balcony perfect for entertaining. Building amenities include a temperature-controlled infinity pool, state-of-the-art gym, and 24/7 concierge. Walking distance to The Walk, JBR Beach, Dubai Marina Mall, and metro.',
  'apartment', 'available', 'sale', 'ready',
  1950000, 'AED', 2, 2, 118,
  'Dubai Marina, Dubai',
  (select id from public.areas where slug = 'dubai-marina'),
  'furnished', true,
  array[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '2-Bedroom Sea View Apartment — Dubai Marina'
);

-- 2. Downtown Dubai — 1BR Apartment for Rent (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, rent_period, featured, images
)
select
  '1-Bedroom Apartment Near Burj Khalifa — Downtown Dubai',
  'Elegant 1-bedroom apartment in the heart of Downtown Dubai offering iconic views of Burj Khalifa and the Dubai Fountain. Fully furnished to a high standard with designer fittings, smart TV, and fully equipped kitchen. Ideal for professionals and short-term rentals. Steps from Dubai Mall, fountain promenade, and multiple metro connections.',
  'apartment', 'available', 'rent', 'ready',
  130000, 'AED', 1, 1, 78,
  'Downtown Dubai, Dubai',
  (select id from public.areas where slug = 'downtown-dubai'),
  'furnished', 'yearly', true,
  array[
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '1-Bedroom Apartment Near Burj Khalifa — Downtown Dubai'
);

-- 3. Palm Jumeirah — 4BR Villa for Sale (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  '4-Bedroom Frond Villa with Private Pool — Palm Jumeirah',
  'Exceptional signature villa on a premium Palm Jumeirah frond offering 260-degree sea views and direct beach access. Spanning three floors with four en-suite bedrooms, a private landscaped garden, infinity pool, and rooftop terrace. Ground floor features a grand entrance, formal dining, and chef''s kitchen. Upper floors include a home cinema, study, and master suite with panoramic ocean views.',
  'villa', 'available', 'sale', 'ready',
  18500000, 'AED', 4, 5, 680,
  'Palm Jumeirah, Dubai',
  (select id from public.areas where slug = 'palm-jumeirah'),
  'unfurnished', true,
  array[
    'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '4-Bedroom Frond Villa with Private Pool — Palm Jumeirah'
);

-- 4. JVC — Studio for Sale (ready) — affordable investment
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  'Furnished Studio — High ROI Investment in JVC',
  'Bright furnished studio apartment in a modern mid-rise building in Jumeirah Village Circle. Currently rented at AED 48,000/year, offering an 8.2% ROI. Open-plan layout with premium finishes, built-in wardrobes, and balcony. Building features rooftop pool, gym, and children''s play area. JVC''s central location provides easy access to all major highways.',
  'apartment', 'available', 'sale', 'ready',
  585000, 'AED', 0, 1, 42,
  'Jumeirah Village Circle, Dubai',
  (select id from public.areas where slug = 'jumeirah-village-circle'),
  'furnished', false,
  array[
    'https://images.unsplash.com/photo-1560448075-bb485b067938?w=800',
    'https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = 'Furnished Studio — High ROI Investment in JVC'
);

-- 5. Business Bay — 3BR Penthouse for Sale (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  '3-Bedroom Penthouse with Canal Views — Business Bay',
  'Extraordinary duplex penthouse crowning one of Business Bay''s prestigious towers. Three bedrooms all with en-suite bathrooms, a double-height living room, chef''s kitchen, and a wrap-around terrace with uninterrupted views of Dubai Water Canal and Downtown skyline. Includes two private parking spaces and storage room. Building offers concierge, valet, pool, and spa.',
  'apartment', 'available', 'sale', 'ready',
  5800000, 'AED', 3, 4, 320,
  'Business Bay, Dubai',
  (select id from public.areas where slug = 'business-bay'),
  'semi_furnished', true,
  array[
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '3-Bedroom Penthouse with Canal Views — Business Bay'
);

-- 6. Dubai Hills Estate — 5BR Villa for Sale (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  '5-Bedroom Golf Course Villa — Dubai Hills Estate',
  'Prestigious Type E villa in the heart of Dubai Hills Estate with direct frontage onto the 18-hole championship golf course. Generously sized across ground and first floors: formal majlis, family lounge, large kitchen, maid''s room on ground floor; master bedroom with walk-in closet and private terrace plus four bedrooms upstairs. Private garden with pool and BBQ area.',
  'villa', 'available', 'sale', 'ready',
  14200000, 'AED', 5, 6, 895,
  'Dubai Hills Estate, Dubai',
  (select id from public.areas where slug = 'dubai-hills-estate'),
  'unfurnished', false,
  array[
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '5-Bedroom Golf Course Villa — Dubai Hills Estate'
);

-- 7. JBR — 2BR Apartment for Rent (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, rent_period, featured, images
)
select
  '2-Bedroom Beachfront Apartment — JBR The Walk',
  'Spacious 2-bedroom apartment in the iconic JBR complex with unobstructed views of the Arabian Gulf. Fully furnished to a resort standard with both bedrooms en-suite. The apartment features an open balcony perfect for alfresco dining. Walking distance to The Walk, The Beach mall, and all JBR amenities. Managed building with pool, gym, sauna, and 24/7 security.',
  'apartment', 'available', 'rent', 'ready',
  185000, 'AED', 2, 2, 136,
  'JBR — Jumeirah Beach Residence, Dubai',
  (select id from public.areas where slug = 'jumeirah-beach-residence'),
  'furnished', 'yearly', true,
  array[
    'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '2-Bedroom Beachfront Apartment — JBR The Walk'
);

-- 8. Dubai Creek Harbour — 1BR Off-plan (off_plan)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, featured, images,
  project_id
)
select
  '1-Bedroom Off-Plan in Creek Gate Towers — Creek Harbour',
  'Invest early in Creek Gate Towers, Emaar''s flagship waterfront development in Dubai Creek Harbour. This 1-bedroom unit offers premium finishes, smart home integration, and stunning views of the upcoming Creek Tower — set to surpass Burj Khalifa in height. Strong capital appreciation projected as the district matures. Handover Q4 2026, 80/20 payment plan.',
  'apartment', 'available', 'sale', 'off_plan',
  1580000, 'AED', 1, 1, 88,
  'Dubai Creek Harbour, Dubai',
  (select id from public.areas where slug = 'dubai-creek-harbour'),
  true,
  array[
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800'
  ],
  (select id from public.projects where slug = 'creek-gate-towers')
where not exists (
  select 1 from public.properties
  where title = '1-Bedroom Off-Plan in Creek Gate Towers — Creek Harbour'
);

-- 9. JLT — Office for Sale (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  'Premium Fitted Office — Jumeirah Lake Towers (DMCC)',
  'Fully fitted and partitioned office unit in JLT''s DMCC free zone — one of the world''s largest free zones. The unit is move-in ready with glass-partition meeting rooms, server room, reception desk, and 18 workstations. Direct lake and skyline views from floor-to-ceiling windows. DMCC license already active — ideal for companies seeking prestigious DMCC presence.',
  'office', 'available', 'sale', 'ready',
  2100000, 'AED', 2, 165,
  'JLT — Jumeirah Lake Towers, Dubai',
  (select id from public.areas where slug = 'jumeirah-lake-towers'),
  'furnished', false,
  array[
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = 'Premium Fitted Office — Jumeirah Lake Towers (DMCC)'
);

-- 10. Arabian Ranches — 3BR Villa for Rent (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, rent_period, featured, images
)
select
  '3-Bedroom Villa — Arabian Ranches Saheel',
  'Beautifully maintained 3-bedroom + maid''s room villa in Arabian Ranches, Saheel cluster. Set on a large single row corner plot with private garden and built-in BBQ. Ground floor: double-height entrance, lounge, dining, modern kitchen, and maids room. First floor: master en-suite plus two bedrooms. Access to community pools, tennis courts, equestrian centre, and Ranches Souk.',
  'villa', 'available', 'rent', 'ready',
  240000, 'AED', 3, 4, 380,
  'Arabian Ranches, Dubai',
  (select id from public.areas where slug = 'arabian-ranches'),
  'unfurnished', 'yearly', false,
  array[
    'https://images.unsplash.com/photo-1605146768851-eda79da39897?w=800',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '3-Bedroom Villa — Arabian Ranches Saheel'
);

-- 11. Downtown — Studio for Rent (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, rent_period, featured, images
)
select
  'Luxury Studio — Burj Khalifa District',
  'High-floor fully furnished luxury studio in the prestigious Burj Khalifa District. Sleek contemporary interior with premium Bosch appliances, in-unit washer/dryer, and a Juliet balcony. Premium building facilities include a rooftop pool, gym, sauna, and residents'' lounge. Walking distance to Dubai Mall and the fountain show. Perfect for professionals or short-term rental.',
  'apartment', 'available', 'rent', 'ready',
  95000, 'AED', 0, 1, 52,
  'Downtown Dubai, Dubai',
  (select id from public.areas where slug = 'downtown-dubai'),
  'furnished', 'yearly', false,
  array[
    'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800',
    'https://images.unsplash.com/photo-1617104678098-de229db51175?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = 'Luxury Studio — Burj Khalifa District'
);

-- 12. Palm Jumeirah — 2BR Apartment for Rent (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, rent_period, featured, images
)
select
  '2-Bedroom Sea View Apartment — Palm Jumeirah Shoreline',
  'Stylish 2-bedroom apartment in Palm Jumeirah''s Shoreline Apartments offering breathtaking views of The Palm and Arabian Gulf. Semi-furnished with quality fitted kitchen, two full bathrooms, and a private beach access. The Shoreline complex features swimming pools, tennis courts, gym, and a strip of cafes and restaurants directly below.',
  'apartment', 'available', 'rent', 'ready',
  210000, 'AED', 2, 2, 145,
  'Palm Jumeirah, Dubai',
  (select id from public.areas where slug = 'palm-jumeirah'),
  'semi_furnished', 'yearly', false,
  array[
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800',
    'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '2-Bedroom Sea View Apartment — Palm Jumeirah Shoreline'
);

-- 13. Business Bay — 1BR for Sale (resale)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  '1-Bedroom Resale with High ROI — Business Bay',
  'Investor-grade 1-bedroom resale apartment in one of Business Bay''s established towers. Currently tenanted at AED 88,000/year — yielding 7.3%. Modern finishes, open kitchen, built-in wardrobes, and partial canal view. Tenant willing to vacate or investor can keep tenancy running. Close to Marasi Drive dining, promenade, and Dubai Water Canal.',
  'apartment', 'available', 'sale', 'resale',
  1200000, 'AED', 1, 1, 82,
  'Business Bay, Dubai',
  (select id from public.areas where slug = 'business-bay'),
  'furnished', false,
  array[
    'https://images.unsplash.com/photo-1560449752-8b6023e2ab5f?w=800',
    'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '1-Bedroom Resale with High ROI — Business Bay'
);

-- 14. City Walk — 3BR Apartment Off-plan
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, featured, images,
  project_id
)
select
  '3-Bedroom Off-Plan Apartment — City Walk Residences Phase 3',
  'Reserve your home in Meraas'' highly anticipated City Walk Residences Phase 3. This 3-bedroom mid-floor apartment will feature Meraas'' signature boutique-living design: Italian marble floors, custom joinery, and a semi-private elevator. Residents will enjoy City Walk''s vibrant streetscape of over 200 F&B and retail outlets plus direct access to the beach via La Mer.',
  'apartment', 'available', 'sale', 'off_plan',
  3750000, 'AED', 3, 3, 218,
  'City Walk, Dubai',
  (select id from public.areas where slug = 'city-walk'),
  true,
  array[
    'https://images.unsplash.com/photo-1614618538254-e4f73ede5c36?w=800',
    'https://images.unsplash.com/photo-1614618537604-18bf3d0e2da0?w=800'
  ],
  (select id from public.projects where slug = 'city-walk-residences-3')
where not exists (
  select 1 from public.properties
  where title = '3-Bedroom Off-Plan Apartment — City Walk Residences Phase 3'
);

-- 15. Dubai Hills — 4BR Townhouse for Sale (ready)
insert into public.properties (
  title, description, type, status, listing_type, completion_status,
  price, currency, bedrooms, bathrooms, area, location,
  area_id, furnishing, featured, images
)
select
  '4-Bedroom Corner Townhouse — Dubai Hills Park Ridge',
  'Spacious corner townhouse in Dubai Hills Park Ridge offering a generous corner plot with park and greenery views. Four bedrooms plus a rooftop terrace with skyline views. Ground floor features a double-height ceiling entrance, open-plan kitchen with island, and a maids room. Direct access to Park Ridge''s central green spine, kids'' pool, and BBQ areas. Moments from Dubai Hills Mall and school belt.',
  'villa', 'available', 'sale', 'ready',
  5600000, 'AED', 4, 4, 460,
  'Dubai Hills Estate, Dubai',
  (select id from public.areas where slug = 'dubai-hills-estate'),
  'unfurnished', false,
  array[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800'
  ]
where not exists (
  select 1 from public.properties
  where title = '4-Bedroom Corner Townhouse — Dubai Hills Park Ridge'
);

-- ── Demo Reviews (approved, on first three properties) ───────────────────────

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'property',
  (select id from public.properties where title = '2-Bedroom Sea View Apartment — Dubai Marina'),
  5,
  'Perfect investment — rented within a week',
  'I purchased this apartment on IQ MultiServices'' recommendation and had a tenant signed within 7 days of handover. The team handled everything from negotiations to RERA registration. Exceptional service and a beautiful unit.',
  'James R.',
  'approved',
  now() - interval '14 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'James R.' and target_type = 'property'
);

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'property',
  (select id from public.properties where title = '2-Bedroom Sea View Apartment — Dubai Marina'),
  4,
  'Great location, smooth transaction',
  'The property is exactly as described — the marina views are spectacular. The process from offer to transfer took only 3 weeks, which is impressive for Dubai. My agent was knowledgeable and patient with all my questions as a first-time buyer.',
  'Priya S.',
  'approved',
  now() - interval '8 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'Priya S.' and target_type = 'property'
);

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'property',
  (select id from public.properties where title = '4-Bedroom Frond Villa with Private Pool — Palm Jumeirah'),
  5,
  'Dream home — worth every dirham',
  'We have been searching for our forever home in Dubai for two years. When IQ showed us this villa we knew instantly. The views from the rooftop at sunset are indescribable. The team negotiated a fair price and managed the NOC and transfer flawlessly. Highly recommended.',
  'Sarah & Tom H.',
  'approved',
  now() - interval '5 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'Sarah & Tom H.'
);

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'property',
  (select id from public.properties where title = '2-Bedroom Beachfront Apartment — JBR The Walk'),
  5,
  'Best rental find in Dubai',
  'Found this apartment through the website late at night, submitted an enquiry, and had a call back first thing next morning. The agent arranged 3 viewings the same day. We moved in within 10 days of our first visit. The apartment is pristine and the building management is excellent.',
  'Mohammed Al A.',
  'approved',
  now() - interval '3 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'Mohammed Al A.'
);

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'property',
  (select id from public.properties where title = 'Furnished Studio — High ROI Investment in JVC'),
  5,
  'Solid yield — great advice from the team',
  'I was looking to diversify into Dubai real estate and the team walked me through the numbers patiently. The JVC studio they recommended is returning 8.1% net — better than anything in London right now. Transferred money from the UK and everything was handled smoothly.',
  'David C.',
  'approved',
  now() - interval '20 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'David C.'
);

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'area',
  (select id from public.areas where slug = 'dubai-marina'),
  5,
  'Best area in Dubai for lifestyle',
  'Living in Dubai Marina for 3 years now and it still impresses me. Everything is walkable — coffee shops, restaurants, a cinema, the beach, and two metro stations. Nighttime views of the marina lights are stunning. Property values have held up well too.',
  'Lena K.',
  'approved',
  now() - interval '11 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'Lena K.'
);

insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, status, created_at)
select
  'area',
  (select id from public.areas where slug = 'dubai-hills-estate'),
  4,
  'Great for families — highly recommend',
  'Moved here from JLT for more space after having kids. The community is clean, safe, and extremely well maintained. Dubai Hills Mall is a 5-minute drive and the golf course is beautiful. Only downside is traffic at school run times.',
  'Fatima N.',
  'approved',
  now() - interval '7 days'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'Fatima N.'
);

-- A pending review (to show the moderation queue)
insert into public.reviews (target_type, target_id, rating, title, body, reviewer_name, reviewer_email, status, created_at)
select
  'property',
  (select id from public.properties where title = '3-Bedroom Penthouse with Canal Views — Business Bay'),
  5,
  'Spectacular penthouse — negotiating now',
  'Just did a viewing yesterday. The wrap-around terrace is unlike anything I have seen at this price point. Still in negotiation but wanted to share my experience — the agent is professional and straight-talking.',
  'Alexei V.',
  'alexei.v@example.com',
  'pending',
  now() - interval '1 day'
where not exists (
  select 1 from public.reviews
  where reviewer_name = 'Alexei V.'
);

-- ── Demo Leads ────────────────────────────────────────────────────────────────

insert into public.leads (
  property_id, name, phone, email, message,
  preferred_contact, status, source, created_at
)
select
  (select id from public.properties where title = '4-Bedroom Frond Villa with Private Pool — Palm Jumeirah'),
  'Jonathan Barnes',
  '0501234567',
  'jonathan.b@example.com',
  'Hello, I am very interested in the Palm Jumeirah villa. Can we arrange a private viewing this weekend?',
  'whatsapp', 'qualified', 'property_detail',
  now() - interval '2 days'
where not exists (select 1 from public.leads where name = 'Jonathan Barnes');

insert into public.leads (
  property_id, name, phone, email, message,
  preferred_contact, status, source, created_at
)
select
  (select id from public.properties where title = '2-Bedroom Sea View Apartment — Dubai Marina'),
  'Aisha Al Mansoori',
  '0559876543',
  'aisha.m@example.com',
  'I want to know if this property is still available. What''s the lowest the seller will go?',
  'phone', 'contacted', 'property_detail',
  now() - interval '4 days'
where not exists (select 1 from public.leads where name = 'Aisha Al Mansoori');

insert into public.leads (
  area_id, name, phone, email, message,
  preferred_contact, status, source, created_at
)
select
  (select id from public.areas where slug = 'dubai-hills-estate'),
  'Raj Patel',
  '0521112233',
  'raj.patel@example.com',
  'Looking for a 4-5 bedroom villa in Dubai Hills or Arabian Ranches. Budget is AED 12-16M. Please send me all available options.',
  'email', 'new', 'area_page',
  now() - interval '6 hours'
where not exists (select 1 from public.leads where name = 'Raj Patel');

insert into public.leads (
  name, phone, email, message,
  preferred_contact, status, source, created_at
)
select
  'Natalie Schwartz',
  '0507778899',
  'natalie.s@example.com',
  'I am relocating from Berlin next month and need a 2-bedroom furnished apartment for rent. Flexible on area. Budget AED 150-200k. Urgent.',
  'whatsapp', 'new', 'home_page',
  now() - interval '1 hour'
where not exists (select 1 from public.leads where name = 'Natalie Schwartz');

insert into public.leads (
  project_id, name, phone, email, message,
  preferred_contact, status, source, created_at
)
select
  (select id from public.projects where slug = 'damac-lagoons-morocco'),
  'Omar Hassan',
  '0551234321',
  'omar.h@example.com',
  'Very interested in DAMAC Lagoons Morocco. Do you have 3-bedroom townhouses available? What is the DLD waiver situation?',
  'whatsapp', 'converted', 'off_plan_page',
  now() - interval '9 days'
where not exists (select 1 from public.leads where name = 'Omar Hassan');

insert into public.leads (
  property_id, name, phone, email, message,
  preferred_contact, status, source, created_at
)
select
  (select id from public.properties where title = 'Furnished Studio — High ROI Investment in JVC'),
  'Chen Wei',
  '0502223344',
  'chen.wei@example.com',
  'I am an overseas investor based in Shanghai. Is this property still generating the rental yield mentioned? Can the purchase be done remotely with POA?',
  'email', 'qualified', 'property_detail',
  now() - interval '3 days'
where not exists (select 1 from public.leads where name = 'Chen Wei');

-- ── Seed property_views (populates analytics dashboard charts) ───────────────
-- Generate ~350 view events spread across the last 30 days for the demo properties
-- Uses generate_series so it's deterministic and idempotent if run once.
do $$
declare
  prop_ids uuid[];
  area_ids uuid[];
  fingerprints text[] := array['fp_abc123','fp_def456','fp_ghi789','fp_jkl012','fp_mno345','fp_pqr678','fp_stu901','fp_vwx234'];
  countries text[]   := array['AE','GB','IN','US','DE','RU','CN','FR','SA','PK'];
  i int;
  pid uuid; aid uuid; fp text; ct text;
begin
  -- Only seed if views table is empty (avoid duplicate analytics on re-runs)
  if (select count(*) from public.property_views) > 0 then
    return;
  end if;

  select array_agg(id) into prop_ids from public.properties;
  select array_agg(id) into area_ids from public.areas;

  for i in 1..350 loop
    pid := prop_ids[ 1 + mod(i * 7, array_length(prop_ids, 1)) ];
    aid := area_ids[ 1 + mod(i * 3, array_length(area_ids, 1)) ];
    fp  := fingerprints[ 1 + mod(i, 8) ];
    ct  := countries[ 1 + mod(i * 11, 10) ];
    insert into public.property_views (property_id, area_id, fingerprint, country, viewed_at)
    values (
      pid, aid, fp || i::text, ct,
      now() - (mod(i, 30) || ' days')::interval - (mod(i * 13, 1440) || ' minutes')::interval
    );
  end loop;
end$$;

-- ── Update views_count on featured properties (demo analytics data) ──────────
update public.properties set views_count = 347 where title = '4-Bedroom Frond Villa with Private Pool — Palm Jumeirah';
update public.properties set views_count = 289 where title = '2-Bedroom Sea View Apartment — Dubai Marina';
update public.properties set views_count = 214 where title = '3-Bedroom Penthouse with Canal Views — Business Bay';
update public.properties set views_count = 198 where title = '1-Bedroom Apartment Near Burj Khalifa — Downtown Dubai';
update public.properties set views_count = 176 where title = '2-Bedroom Beachfront Apartment — JBR The Walk';
update public.properties set views_count = 163 where title = 'Furnished Studio — High ROI Investment in JVC';
update public.properties set views_count = 141 where title = '5-Bedroom Golf Course Villa — Dubai Hills Estate';
update public.properties set views_count = 128 where title = '1-Bedroom Off-Plan in Creek Gate Towers — Creek Harbour';
update public.properties set views_count = 112 where title = '3-Bedroom Off-Plan Apartment — City Walk Residences Phase 3';
update public.properties set views_count = 98  where title = '4-Bedroom Corner Townhouse — Dubai Hills Park Ridge';

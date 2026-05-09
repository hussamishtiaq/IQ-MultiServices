# IQ MultiServices — Project Context

> Keep this file up to date whenever a significant feature or schema change is made.
> Claude reads this at the start of each session to avoid going out of context.

---

## What This Project Is

Dubai-based real estate brokerage platform. Public-facing property portal + admin CMS.  
Tech: **Next.js 14 App Router · Supabase (Postgres + Auth + Storage) · Cloudinary · Tailwind CSS**

Live concept: list properties for sale/rent, off-plan projects, Dubai community guides, lead capture, and reviews.

---

## Domain Rules (important for all code)

| Rule | Detail |
|---|---|
| Currency | AED primary, USD secondary. `formatPrice(price, currency)` in `src/lib/format.ts` |
| Bedrooms | `0` = Studio (never "0 bedrooms"). Studios have a sub-type (`studio_type`) |
| Studio types | `standard · alcove · convertible · loft · micro` — layout, not occupancy |
| Listing types | `sale` or `rent` |
| Completion status | `ready · off_plan · resale` |
| Property status | `available · sold · rented` |
| Property types | `apartment · villa · commercial · land · office` |
| Lead status | `new → contacted → qualified → converted → lost` |
| Review status | `pending` (default) → `approved` (public) or `rejected` |
| Auth | Supabase email/password. Admin routes `/admin/*` protected by `src/middleware.ts` |

---

## Architecture

```
src/
├── app/
│   ├── admin/              ← Admin CMS (authenticated only)
│   │   ├── page.tsx        ← Dashboard KPIs
│   │   ├── analytics/      ← Recharts dashboard (7 SQL views)
│   │   ├── properties/     ← List + new + [id]/edit + bulk editor
│   │   ├── areas/          ← Dubai community manager
│   │   ├── projects/       ← Off-plan project manager
│   │   ├── developers/     ← Developer manager
│   │   ├── leads/          ← CRM lead list
│   │   ├── reviews/        ← Moderation queue
│   │   ├── contacts/       ← Contact channels
│   │   └── settings/       ← Site settings (Supabase key-value)
│   ├── api/
│   │   ├── properties/     ← GET paginated listings (supports all filters)
│   │   ├── leads/          ← POST lead + fires Resend email
│   │   ├── reviews/        ← POST review (lands as pending)
│   │   └── views/          ← POST anonymous property view beacon
│   ├── properties/         ← RSC shell + PropertiesClient (TanStack Query)
│   ├── areas/              ← Area list + [slug] community page
│   ├── off-plan/           ← [developer]/[project] detail page
│   ├── buy/ rent/          ← Pre-filtered shortcuts to /properties
│   └── page.tsx            ← Home: hero, featured areas, stats
├── components/
│   ├── admin/AdminSidebar.tsx   ← Top header + desktop sidebar + mobile drawer
│   ├── PropertyCard.tsx         ← Shows Studio / studio_type label for 0-bed
│   ├── Reviews.tsx              ← StarPicker, submission, approved list
│   ├── LeadForm.tsx             ← Lead capture with channel picker + honeypot
│   ├── FloatingCTAs.tsx         ← Mobile WhatsApp / Call buttons
│   └── TrackPropertyView.tsx    ← Anonymous view beacon (fires once on mount)
├── lib/
│   ├── format.ts           ← formatPrice, CURRENCY_OPTIONS
│   ├── platform-icons.tsx  ← platform string → React icon component (NEVER store JSX in DB)
│   ├── safe-url.ts         ← safeContactHref — validates external URLs
│   └── email.ts            ← sendEmail via Resend (no-ops if RESEND_API_KEY missing)
├── types/index.ts          ← All shared TypeScript types
└── middleware.ts           ← Protects /admin/* — MUST be in src/ not root
```

---

## Database Schema (Supabase)

### Core tables

| Table | Key columns |
|---|---|
| `properties` | id, title, slug, type, status, listing_type, completion_status, studio_type, bedrooms, bathrooms, area(m²), price, currency, location, area_id, project_id, furnishing, rent_period, images[], featured, views_count |
| `areas` | id, slug, name, hero_image, avg_price_sale_aed, avg_price_rent_aed, avg_roi_pct, popular_unit_types[] |
| `developers` | id, slug, name, logo, website |
| `projects` | id, slug, name, developer_id, area_id, starting_price_aed, payment_plan, handover_quarter, status, unit_types[], featured |
| `leads` | id, property_id, project_id, area_id, name, phone, email, message, preferred_contact, status, source |
| `reviews` | id, target_type(property/area/agent), target_id, rating, title, body, reviewer_name, status |
| `contacts` | id, platform, label, value, order |
| `services` | id, title, description, order |
| `site_settings` | key, value (key-value store for admin-configurable settings) |
| `property_views` | property_id, area_id, fingerprint, country, viewed_at |

### SQL views (analytics dashboard reads these)
`v_kpi_30d · v_views_by_area_30d · v_views_by_type_30d · v_listings_by_status · v_leads_daily_90d · v_leads_by_completion_90d · v_top_properties_30d`

### RLS summary
- Properties, areas, developers, projects: **public read**, authenticated write
- Leads: **public insert only**, authenticated read/update
- Reviews: **public insert (pending only)**, **public read (approved only)**, authenticated full access
- property_views: **public insert**, authenticated read

---

## Migrations (run in order in Supabase SQL Editor)

| File | What it does |
|---|---|
| `0001_add_currency.sql` | Adds currency column to properties |
| `0002_drop_icon_columns.sql` | Removes icon columns (platform-icons.tsx used instead) |
| `0003_real_estate_phase1.sql` | Creates areas, developers, projects, leads; extends properties; seeds 20 Dubai areas |
| `0004_seed_services.sql` | Seeds 11 services |
| `0005_analytics.sql` | Creates property_views + 7 dashboard SQL views |
| `0006_seed_developers.sql` | Seeds 8 Dubai developers (Emaar, DAMAC, Sobha, Nakheel, Meraas, Binghatti, Aldar, Azizi) |
| `0007_reviews.sql` | Creates reviews table with RLS |
| `0008_demo_seed.sql` | Demo data: 15 properties, 5 projects, 8 reviews, 6 leads, 350 view events |
| `0009_studio_type.sql` | Adds studio_type column to properties |

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
RESEND_API_KEY=              # optional — emails no-op if missing
LEAD_EMAIL_TO=               # where lead notifications go
LEAD_EMAIL_FROM=             # sender address (must be verified in Resend)
```

---

## Key Patterns & Gotchas

### Auth / middleware
- `src/middleware.ts` MUST be in `src/` — Next.js ignores root `middleware.ts` when `src/` dir exists
- Login uses `window.location.href = '/admin'` (hard navigation) — NOT `router.push` — because `router.push` is a soft nav that fires before the Set-Cookie header from Supabase is processed

### Platform icons
- `src/lib/platform-icons.tsx` maps `platform: string → React component`
- **NEVER** store JSX/ReactNode in the DB. Store the platform string, render the icon at display time.

### Properties API (`/api/properties`)
Supported query params: `page, type, status, listing, completion, area(slug), beds, studio_type, q`  
- `beds=0` = Studio; `studio_type` only meaningful when `beds=0`
- `area` is a slug string — the route resolves it to a UUID internally

### Studio classification
- A studio is always `bedrooms = 0`
- `studio_type` is an optional sub-classification: `standard | alcove | convertible | loft | micro`
- The public filter shows bedroom pills (Any / Studio / 1 beds / 2 beds / 3 beds / 4 beds / 5+ beds)
- When Studio pill is selected, a secondary "Studio Layout" pill row appears
- PropertyCard shows "Alcove Studio" / "Loft Studio" etc. instead of "0 bd"
- Admin form shows the Studio Layout dropdown only when Bedrooms = 0

### PropertiesClient (infinite scroll)
- RSC shell (`properties/page.tsx`) fetches page 1 server-side and passes as `initialData`
- `PropertiesClient` uses TanStack Query v5 `useInfiniteQuery` with intersection observer for auto-load
- `useSearchParams()` must be wrapped in `<Suspense>` (done in the RSC shell)

### Image hosting
- Cloudinary for admin uploads (unsigned preset)
- `next.config.js` allows `res.cloudinary.com` and `*.supabase.co` in `remotePatterns`
- `sharp` must be installed: `npm install sharp`

### Tailwind custom classes (in globals.css)
`btn-primary · btn-secondary · btn-accent · input-field · input-icon · label · badge-available · badge-sold · badge-rented · container-main`

---

## Planned / Not Yet Built

- Demo environment separation (Option A: separate Supabase project for demos)
- Property slug-based URLs (`/properties/palm-villa-4br` instead of UUID)
- Map view (Mapbox or Google Maps) for area pages
- Mortgage / ROI calculator widget
- Multi-language support (Arabic)
- WhatsApp chat widget integration

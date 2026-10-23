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
| `0010_property_slug_autogen.sql` | Trigger auto-generates `properties.slug` from title (collision-safe); backfills existing rows |
| `0011_messaging.sql` | Messaging: `audience_contacts`, `suppressions`, `campaigns`, `messages`, `v_channel_health_7d`; seeds `business_postal_address` setting |
| `0012_listing_compliance.sql` | Adds `permit_number` (Trakheesi), `agent_name`, `agent_brn` to properties — **run before saving properties in admin** |
| `0013_sales_automation.sql` | `agents`, `viewings`, `saved_searches`, `property_alerts_sent`; leads gain `assigned_agent_id`, `next_follow_up_at`, `notes`, `contact_id` |

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

# RERA compliance shown in footer / listing pages
NEXT_PUBLIC_COMPANY_ORN=     # RERA office registration number
NEXT_PUBLIC_TRADE_LICENSE=   # DED trade licence number
NEXT_PUBLIC_WHATSAPP_NUMBER= # click-to-chat number on cards (detail page prefers Contacts → platform "whatsapp")
WHATSAPP_ACK_TEMPLATE=       # optional approved utility templates; without them WhatsApp
WHATSAPP_VIEWING_TEMPLATE=   #   acks/confirmations/alerts are skipped (email still sent)
WHATSAPP_ALERT_TEMPLATE=
WHATSAPP_TEMPLATE_LANG=en

# Messaging (bulk email + WhatsApp, two-way)
SUPABASE_SERVICE_ROLE_KEY=   # server-only; webhooks, cron dispatch, unsubscribe
MARKETING_EMAIL_FROM=        # e.g. "IQ MultiServices <news@mail.yourdomain.ae>" (use a subdomain)
MARKETING_EMAIL_REPLY_TO=    # address on a Resend receiving domain so replies reach the inbox
MARKETING_UNSUBSCRIBE_MAILTO=# optional mailto for List-Unsubscribe
RESEND_WEBHOOK_SECRET=       # whsec_... from Resend webhook settings
EMAIL_MAX_DAILY=2000         # ceiling after warm-up; EMAIL_BATCH_SIZE=50 per dispatch run
WHATSAPP_ACCESS_TOKEN=       # Meta system-user permanent token
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=         # verifies X-Hub-Signature-256
WHATSAPP_VERIFY_TOKEN=       # any random string; entered in Meta webhook config
WHATSAPP_DAILY_CAP=250       # set to your current Meta messaging tier
CRON_SECRET=                 # scheduler auth for /api/messaging/dispatch
MESSAGING_DRY_RUN=false      # true = simulate sends (no provider calls)
# MESSAGING_SEND_START_HOUR=9 MESSAGING_SEND_END_HOUR=18 MESSAGING_TIMEZONE=Asia/Dubai
```

---

## Key Patterns & Gotchas

### Auth / middleware
- `src/middleware.ts` MUST be in `src/` — Next.js ignores root `middleware.ts` when `src/` dir exists
- Login uses `window.location.href = '/admin'` (hard navigation) — NOT `router.push` — because `router.push` is a soft nav that fires before the Set-Cookie header from Supabase is processed

### Platform icons
- `src/lib/platform-icons.tsx` maps `platform: string → React component`
- **NEVER** store JSX/ReactNode in the DB. Store the platform string, render the icon at display time.

### Property URLs
- `/properties/[id]` accepts either the UUID or the slug — `src/lib/slug.ts` `isUuid()` picks the lookup column
- A DB trigger (`0010_property_slug_autogen.sql`) fills `slug` from `title` on insert/update of title, unique via `-1`, `-2`… suffix
- Visiting by UUID when a slug exists redirects (SEO canonicalization) to the slug URL
- `PropertyCard` and `sitemap.ts` always link via `slug ?? id`

### Dubai buyer tools & listing compliance
- `src/lib/purchase-costs.ts` — fee constants (DLD 4%, trustee AED 2k/4k + VAT, agency 2% + VAT, mortgage reg 0.25% + AED 290), `monthlyPayment`, `goldenVisaLikely` (sale ≥ AED 2M, not land; USD converted at 3.6725 peg). Update constants here if DLD fees change
- `PurchaseCalculator` renders on available sale listings (off-plan: no agency/trustee, no mortgage toggle)
- Golden Visa badge on cards + detail is an *indicator* — real eligibility uses DLD valuation
- Listings show Trakheesi permit + agent BRN when set; admin form warns when an available listing has no permit

### Sales automation — `src/lib/sales/` (core.ts = pure + tested, server.ts = Supabase flows)
- Listing ref `IQ-XXXXXX` = first 6 hex of the property UUID. "Ask on WhatsApp" buttons (cards, detail, floating CTA) prefill title + price + ref + URL
- Inbound WhatsApp containing a ref → contact + lead (`source='whatsapp'`) + round-robin agent + verified listing summary (once per listing per 30 days). `VISIT` → booking link. Wired via `applyEvents(..., { onInbound })`
- Every new lead (`processNewLead`): follow-up = +24h, round-robin agent (least recently assigned active agent) + agent email, acknowledgment email (and WhatsApp template if `WHATSAPP_ACK_TEMPLATE`)
- Viewings: Dubai slots 10:00–18:00, hourly, 14 days ahead, 3h minimum notice; unique indexes stop double-booking per property and per agent. Admin confirm → confirmation; dispatch sends reminders ~2–26h before
- Saved searches: explicit opt-in on the listing page; dispatch emails matches for listings created after signup (once per listing, inside the send window, unsubscribe link)
- Admin: `/admin/agents`, `/admin/viewings`, Leads page has agent + follow-up columns and "Follow-ups due" filter
- E2E: a Playwright script (kept outside the repo) drove 19 UI workflows against the real DB in dry-run mode and cleaned up after itself

### Messaging (bulk email + WhatsApp, two-way) — `src/lib/messaging/`
- **Why it exists:** bulk cold messaging gets numbers banned and domains blocklisted. The system enforces the rules in code so that can't happen by accident.
- `compliance.ts` — pure rules: consent eligibility, Dubai 09:00–18:00 send window (UAE Cabinet Res. 56/2024), email warm-up caps, WhatsApp 24h service window, health circuit breaker (bounce >2%, complaints >0.1%, WA failures >10%), STOP/START keywords (EN + AR)
- Consent model: `email_consent` opted_in | implied (existing relationship) | unknown | opted_out; `whatsapp_consent` opted_in | unknown | opted_out. Marketing email needs opted_in/implied; marketing WhatsApp needs opted_in. `unknown` = 1:1/utility only
- `suppressions` is the global do-not-contact list, re-checked at **send time**, not just at launch. Complaints/hard bounces can't be removed in the UI
- Flow: campaign draft → `launch` queues eligible recipients → `/api/messaging/dispatch` (cron every 10 min, or "Send next batch" button) sends throttled batches → provider webhooks update status, store replies, and auto-suppress on STOP/unsubscribe/bounce/complaint/Meta 131050
- `service.ts` takes a `MessagingStore` (Supabase impl in `store.ts`, in-memory impl in `__tests__/memory-store.ts`) so flows are unit-tested. Run `npm test`
- Unsubscribe: RFC 8058 one-click via POST `/api/unsubscribe?t=TOKEN`; GET only shows `/unsubscribe` confirm page (link scanners prefetch GETs)
- Lead form has two unticked consent checkboxes; ticks are stored with timestamp + IP as `*_consent_source`
- Admin: `/admin/messaging` (health + setup checklist), `/inbox`, `/campaigns`, `/contacts` (CSV import requires a consent basis + evidence note)

**Go-live setup**
1. Run `0011_messaging.sql`; set `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
2. Email: add a sending subdomain in Resend, publish its SPF/DKIM records + a DMARC record (`p=none` minimum), enable receiving (MX) for replies, add webhook → `https://<site>/api/webhooks/resend` with events sent/delivered/bounced/complained/received/opened
3. WhatsApp: Meta Business verification → WhatsApp Business Account → phone number → system-user token. Webhook → `https://<site>/api/webhooks/whatsapp` (verify token = `WHATSAPP_VERIFY_TOKEN`), subscribe to `messages` and `phone_number_quality_update`. Create + get templates approved in WhatsApp Manager (add a "Stop promotions" quick reply to marketing templates)
4. Scheduler: `vercel.json` runs dispatch every 10 min (Vercel Pro; Hobby allows daily only — otherwise point any external cron at `GET /api/messaging/dispatch` with `Authorization: Bearer $CRON_SECRET`)
5. Start with `MESSAGING_DRY_RUN=true`, launch a test campaign to your own addresses, then switch off

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
- Map view (Mapbox or Google Maps) for area pages
- ROI / rental-yield calculator (mortgage + purchase-cost calculator is done)
- Buyer guide content pages (process, fees, off-plan vs ready, Golden Visa, glossary) — SEO
- Multi-language support (Arabic)

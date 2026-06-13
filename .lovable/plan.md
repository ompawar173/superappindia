
# SuperApp India — Build Plan (v1)

A Careem/Grab-style aggregator for India: one app for food, grocery, travel, hotels, and own services. Revenue model = affiliate commissions on partner deep-links + ONDC commerce + own-services margin.

> Scope note: even though you mentioned signed partner API agreements, partner brands like Swiggy/Zomato/MMT/Oyo deliver very different API surfaces (some only give affiliate/UTM deep links, a few give product feeds, almost none give live cart/checkout). v1 will be built **affiliate-first** with a clean adapter layer so we can swap any partner to a real API later without rewriting the UI.

---

## 1. Product surfaces

**A. User app** (public + authenticated)
- Home: location header, search, category tiles (Food, Grocery, Travel, Hotels, Cabs, Pharmacy, Recharge, Own Services), promo carousel, "Near you" rail
- Category page → partner list with offers/cashback → "Order on Swiggy" CTA → tagged redirect (UTM + click logged)
- ONDC catalog browser (grocery/retail) — in-app cart + checkout (scaffolded against ONDC staging)
- Own Services section (configurable from admin — e.g. concierge, private-label, wallet top-up)
- Auth (email + Google), profile, addresses, order history (affiliate self-reported + ONDC confirmed + own-services real), wallet/rewards ledger, referrals

**B. Vendor panel** (`/vendor/*`)
- Vendor signup + KYC upload
- Catalog (for ONDC sellers and own-services providers): items, price, stock, images
- Orders inbox, status updates, payouts view
- Settlement reports

**C. Admin panel** (`/admin/*`) — two sub-areas as you asked
1. **Aggregator admin**: partners CRUD, UTM/affiliate link generator (per partner × per campaign × per channel), click & conversion analytics, postback ingestion logs, commission rules, payouts
2. **Own-services & vendor admin**: vendor approvals, ONDC participant config, own-services catalog, orders, refunds, users, roles, CMS (banners/categories/promos), reports

---

## 2. Architecture

```
TanStack Start (React 19, Vite 7, Tailwind v4)
├─ Public routes:        /, /c/$category, /p/$partner, /r/$linkId (tracked redirect)
├─ _authenticated/*:     user account, cart, checkout, orders, wallet
├─ _authenticated/_vendor/*  (role: vendor)
├─ _authenticated/_admin/*   (role: admin | super_admin)
└─ api/public/*:         affiliate postbacks, ONDC Beckn callbacks, webhooks

Lovable Cloud (Supabase):
├─ Postgres + RLS         (all tables)
├─ Auth                   (email/password + Google)
├─ Storage                (vendor KYC, catalog images, banners)
└─ Server functions       (createServerFn) for all reads/writes
    + Server routes (/api/public/*) for ONDC + affiliate postbacks
```

Adapter pattern keeps partner integrations swappable:
```
src/lib/partners/
  types.ts              // PartnerAdapter interface
  affiliate.adapter.ts  // default: deep-link + UTM + postback
  swiggy.adapter.ts     // upgrade target when API access lands
  ondc.adapter.ts       // Beckn protocol
  registry.ts           // partner_slug -> adapter
```

---

## 3. Data model (Postgres, all with RLS + GRANTs)

Core
- `profiles` (id → auth.users, name, phone, default_address, referral_code)
- `app_role` enum: `user | vendor | admin | super_admin`
- `user_roles` (separate table per security rule) + `has_role()` SECURITY DEFINER fn

Catalog & partners
- `categories` (slug, name, icon, sort, active)
- `partners` (slug, name, logo, category_id, type: `affiliate|ondc|own`, base_url, commission_pct, active)
- `partner_offers` (partner_id, title, code, terms, valid_to)

Affiliate tracking
- `affiliate_links` (id, partner_id, campaign, channel, utm_source/medium/campaign/content, target_url, created_by)
- `link_clicks` (link_id, user_id?, ts, ip_hash, ua, ref, device)
- `conversions` (link_id, click_id, partner_order_id, gross, commission, status, postback_payload jsonb, ts)
- `commission_rules` (partner_id, pct, fixed, tier_json)
- `payouts` (partner_id|vendor_id, period, amount, status)

Vendors & own services
- `vendors` (id → user, business_name, gstin, kyc_status, payout_account)
- `vendor_products` (vendor_id, sku, title, price, stock, images, ondc_attrs jsonb, active)
- `orders` (id, user_id, source: `own|ondc`, vendor_id?, items jsonb, totals, status, address, payment_ref)
- `order_events` (order_id, status, note, actor, ts)
- `wallet_ledger` (user_id, type, amount, ref, balance_after)
- `referrals` (referrer, referee, reward_state)

ONDC
- `ondc_participants` (subscriber_id, role, domain, registry_env, signing_pub_key, encr_pub_key, ukid)
- `ondc_transactions` (transaction_id, message_id, action, payload jsonb, status, ts) — full Beckn audit log

CMS
- `banners`, `promos`, `home_sections`, `settings_kv`

Every table: explicit GRANTs to `authenticated`/`service_role` (+ `anon` only where reads are public), RLS policies via `has_role()`.

---

## 4. Affiliate / UTM flow

1. Admin creates a partner → generates `/r/{linkId}` short link with stored UTM bundle.
2. Tracked redirect route logs `link_clicks` (with `user_id` if signed in) then 302 to `target_url?utm_*`.
3. Partner network posts back to `/api/public/postbacks/{network}` (Cuelinks/INRDeals/Impact/Admitad/EarnKaro formats) → HMAC verify → `conversions` row → commission computed → user wallet credit if applicable.
4. Admin dashboards: clicks, CR%, EPC, GMV, commission, partner-wise & campaign-wise; CSV export.

---

## 5. ONDC scaffold (Buyer App)

Built but not registered — ready to flip to staging once you have `subscriber_id` + keys.

- `/api/public/ondc/on_search`, `on_select`, `on_init`, `on_confirm`, `on_status`, `on_update`, `on_cancel`, `on_rating`, `on_support` callbacks
- `/api/public/ondc/on_subscribe` for registry challenge
- Outbound Beckn client (`src/lib/ondc/beckn.ts`): `search/select/init/confirm/status` with Ed25519 request signing + auth header builder
- Crypto helpers using Web Crypto (libsodium-style Ed25519 via `@noble/ed25519`, X25519 for encryption)
- Schema validation against Beckn JSON schemas
- `ondc_transactions` audit table for every inbound/outbound message
- Admin → ONDC tab: participant config, env switch (staging/preprod/prod), test harness button

This gives you a working Buyer NP shell; going live is then: get LSP/registration → drop in keys → toggle env.

---

## 6. Auth, roles, security

- Lovable Cloud auth: email/password + Google (default per guidance)
- `user_roles` table + `has_role()` (never store role on profile)
- Route gates: `_authenticated` (managed), `_authenticated/_vendor`, `_authenticated/_admin`
- All admin/vendor server fns use `requireSupabaseAuth` + `has_role` check
- HIBP leaked-password protection enabled
- Webhook routes under `/api/public/*` always HMAC-verified (timing-safe)

---

## 7. Design system (green & white, modern Indian super-app)

- Primary green `oklch(0.62 0.17 155)` (fresh, India-festive but not Swiggy-orange), accent lime, surface near-white `oklch(0.99 0 0)`, ink `oklch(0.18 0.02 160)`
- Tokens defined in `src/styles.css` `@theme` (Tailwind v4 CSS-first) — no hardcoded colors in components
- Type: Plus Jakarta Sans (display) + Inter (body); rounded-2xl cards; soft elevated shadows; bottom-tab bar on mobile, side rail on desktop
- Reference vibe: Careem (category-tile density, warm dark-on-white), Grab (rounded chips, prominent rewards strip) — adapted for ₹/INR, Hindi-friendly spacing, festival promo slots
- shadcn components themed via tokens; framer-motion for tile/card transitions

---

## 8. Build order (phased so you see value fast)

**Phase 1 — Foundation (this iteration)**
- Design system, layout shell (top bar, bottom tabs, sidebars)
- Auth + roles + profile
- DB schema + RLS + seed categories/partners
- Home, category, partner detail pages
- Tracked-redirect `/r/$linkId` + click logging
- Admin: partners CRUD + UTM link generator + clicks dashboard

**Phase 2 — Monetization loop**
- Postback receivers (Cuelinks/Impact/EarnKaro formats), conversions dashboard
- Commission rules, wallet ledger, referrals
- User order history (affiliate self-reported + conversions)

**Phase 3 — Vendor + own services**
- Vendor signup/KYC, vendor catalog, vendor orders
- Own-services checkout (Stripe/Razorpay via Lovable payments)
- Admin: vendor approvals, payouts

**Phase 4 — ONDC scaffold**
- Beckn client + callback routes + crypto + audit log
- Admin ONDC config UI + test harness
- ONDC catalog browse + checkout in user app (staging-ready)

**Phase 5 — Polish**
- Search across partners + ONDC, location/geo, push/email notifications, analytics dashboards, CMS for home sections, i18n (EN/HI)

---

## 9. Technical details

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn (already scaffolded)
- Server: `createServerFn` for app logic; `/api/public/*` server routes for webhooks/ONDC; `requireSupabaseAuth` middleware + role checks
- Query: TanStack Query for all reads (loader `ensureQueryData` + `useSuspenseQuery`)
- Cloud: Supabase (Postgres + Auth + Storage); RLS on everything; `has_role()` SECURITY DEFINER
- Crypto: `@noble/ed25519` + Web Crypto for ONDC signing
- Validation: Zod on every server-fn input and webhook body
- Payments (Phase 3): Lovable Payments (Stripe or Razorpay via Paddle/Stripe wrapper)
- Observability: `ondc_transactions` + webhook logs tables; admin log viewer

## 10. Out of scope for v1 (call out so we agree)

- Real driver/delivery network, live cart sync with Swiggy/Zomato (no public API)
- Going live on ONDC production (needs LSP onboarding, signed NP agreement, security audit)
- Native iOS/Android (PWA-first; wrap later)
- KYC automation (manual review in admin for v1)

## 11. Open question

You skipped "own services". I'll scaffold the section with: **wallet & cashback, referral rewards, mobile/DTH recharge (BBPS-ready stub), and a "Concierge request" form**. Tell me to swap if you had something else in mind (private-label grocery, insurance, lending, etc.).

---

Approve this and I'll start with **Phase 1**: design system + auth + schema + home/category/partner pages + admin partner & UTM module.

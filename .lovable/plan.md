
# Vendor Visibility & Search

Make every approved vendor (shop/hotel/service) and their listings visible on the SuperApp India homepage and searchable across the app.

## 1. Homepage — "Shops on SuperApp India" rail

New section on `/` between the Categories grid and the Services hub:

- Horizontally scrollable rail of vendor cards.
- Each card: shop logo/cover, business name, category tag, rating, "Open / Closed" pill, delivery ETA estimate.
- Pulls from `vendors` where `kyc_status = 'approved'` and `is_active = true`, ordered by rating desc, newest first.
- "View all" link → `/shops`.

A second rail below it: **"Fresh from local shops"** — latest 12 `vendor_products` where `is_active = true` and the parent vendor is approved. Tapping a product opens its vendor's shop page.

## 2. New routes

- `/shops` — full grid of approved vendors with filter chips (All, Grocery, Food, Pharmacy, Fashion, Electronics, Services…) and a search box scoped to shops.
- `/shop/$vendorId` — vendor storefront page:
  - Header: cover image, logo, business name, category, rating, address, open hours.
  - Tabs: **Products** | **Services** | **About**.
  - Product/service grid with add-to-cart (products) or book (services).
  - "Share shop" button.
  - `head()` sets title `{businessName} — SuperApp India`, OG image = cover.

## 3. Global search upgrade (`/search`)

Single search box, three result groups shown in order:
1. **Shops** — match on `vendors.business_name`, `vendors.tagline`, `vendors.category` (ILIKE).
2. **Products** — match on `vendor_products.name`, `description`, `category` where `kind='product'`.
3. **Services** — match on `vendor_products.name`, `description` where `kind='service'`, plus the platform `services` table.

Each result card links to `/shop/$vendorId` (shops), `/shop/$vendorId#product-$id` (product), or the service detail. Empty-state suggestions show top shops.

Header search bar in `app-shell` posts to `/search?q=...`.

## 4. Server functions (in `src/lib/storefront.functions.ts`)

Public, admin-elevated (no auth required — these are public listings):

- `listApprovedVendors({ limit, category? })` → vendor cards for home rail and `/shops`.
- `listLatestVendorProducts({ limit })` → "Fresh from local shops" rail.
- `getVendorStorefront({ vendorId })` → vendor + products + services (only `is_active`).
- `searchEverything({ q })` → `{ shops, products, services }`.

All use `supabaseAdmin` imported inside the handler, projecting only public-safe columns (no KYC, no commission, no contact email/phone unless vendor opted in).

## 5. Vendor cover/logo

`vendors` already has business fields. Add (migration):
- `cover_url text`
- `logo_url text`
- `tagline text`
- `is_active boolean default true`
- `rating numeric default 0`

Vendor dashboard `/vendor` → Profile tab gets upload fields for logo + cover (stored in existing `vendor-products` bucket under `vendors/{id}/`).

## 6. Admin

`/admin/vendors` already exists for KYC approve/reject. Add an "Active" toggle column so admin can hide a vendor without un-approving them.

## Technical notes

- All listing queries filter `kyc_status='approved' AND is_active=true` server-side — non-approved vendors never appear publicly.
- Public route loaders call the public server fns (no `requireSupabaseAuth`) so SSR/prerender works and OG tags render for shop share links.
- Search uses Postgres `ILIKE '%q%'` initially; can upgrade to `pg_trgm` GIN index later if volume grows.
- No changes to delivery/assignment logic — orders still flow through the existing rider engine.

## Open questions

1. Should the homepage rail also mix in **service providers** (plumber, salon, etc.) alongside shops, or keep shops-only and let the existing "SuperApp India Services" rail handle services?
2. For ordering: when a customer adds a product, should the cart be **single-vendor** (one shop per order) or **multi-vendor** (split into sub-orders at checkout)? Multi-vendor is more work on the rider-assignment side.

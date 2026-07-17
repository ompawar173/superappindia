## Goal
Turn SuperApp India into a purely local marketplace: no third-party partners/affiliate surfaces anywhere, local businesses register directly, and service enquiries flow from customers → admin.

## 1. Remove third-party surfaces
- **`src/routes/c.$category.tsx`** — stop reading `partners`. Show local `vendors` (approved, matching category) + `vendor_products` in that category.
- **`src/routes/categories.tsx`** — copy: "Pick a category to see local shops" (not "partners").
- **`src/routes/rewards.tsx`** — rewrite copy: coins redeemable on local shops/services (no "partner offers").
- **`src/routes/admin.tsx` nav** — already partner-free. Leave `partners`, `affiliate_links`, `conversions`, `link_clicks`, `partner_offers`, `ondc_*` tables in DB (no user-facing surface reads them anymore). ONDC/postback API routes stay for future but no UI links to them.
- Delete unused route files if any reference partners (none currently — `/p/$partner` route doesn't exist, so the dead `<Link to="/p/$partner">` in `c.$category.tsx` is removed with the rewrite).

## 2. "Register your local business" info
- **`src/routes/delivery.index.tsx`** already covers riders. Add a matching public **`src/routes/register.tsx`** landing that explains: local shopkeepers, hotels, home services, transporters can join — with two CTAs → `/seller/auth` (shop) and `/delivery/auth` (rider).
- Add a link in the homepage hero + footer/app-shell to `/register`.

## 3. Service requests (customer → admin)
New table `service_requests`:
- `id, user_id (nullable for guests), service_id, name, phone, address, city, pincode, scheduled_for (nullable), notes, status ('new'|'assigned'|'in_progress'|'completed'|'cancelled'), created_at, updated_at`
- RLS: user reads own; admin reads all; anyone authenticated can insert their own; admin can update status.
- GRANTs: `authenticated` SELECT/INSERT own, admin ALL; `service_role` ALL.

Surfaces:
- **`src/routes/services.$slug.tsx`** — add "Request this service" form (name, phone, address, date, notes). Requires sign-in; unauthenticated users see a "Sign in to request" CTA.
- **`src/routes/admin.service-requests.tsx`** (new) — admin queue: list all requests with status filter, mark assigned/in-progress/completed, contact info visible.
- Add nav item in `src/routes/admin.tsx` sidebar: "Service Requests".

## 4. Services visibility on home
- Verify `ServicesRail` on `src/routes/index.tsx` shows all `services WHERE active=true`. If empty, seed a few common home/kitchen services in the migration (Plumber, Electrician, AC repair, Cook, House cleaning, Salon at home) so they appear immediately.

## 5. Category-aware landing after sign-in
- On `src/routes/auth.tsx` success: existing behaviour redirects to `/`. Keep as is — home page already surfaces categories & shops. Vendor sign-in goes to `/vendor`, rider to `/delivery/dashboard`. No change needed here beyond confirming redirects; user's phrasing "particular category will be show" is satisfied by the category → local shops browsing flow rebuilt in step 1.

## 6. Credentials
Already email+password for user (`/auth`), vendor (`/seller/auth`), rider (`/delivery/auth`) with auto-confirm on. No change.

## Migration
Single migration:
1. Create `service_requests` + grants + RLS + policies + `updated_at` trigger.
2. Seed default home/kitchen services (idempotent `ON CONFLICT (slug) DO NOTHING`).

## Files touched
- Edit: `c.$category.tsx`, `categories.tsx`, `rewards.tsx`, `services.$slug.tsx`, `admin.tsx`, `index.tsx`.
- New: `register.tsx`, `admin.service-requests.tsx`.
- Migration: `service_requests` table + seed services.

## Out of scope (say no if asked mid-flight)
Dropping the partners/affiliate/ondc tables — leaving them dormant avoids touching working postback endpoints; can remove later once confirmed unused.

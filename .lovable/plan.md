
# Plan — v2 upgrades

Seven focused changes, grouped so we can ship them in one pass.

---

## 1. Separate sign-in pages for User vs Seller

Today `/auth` is shared. Split it:

- **`/auth`** — customer login/signup (email + Google), unchanged copy aimed at shoppers.
- **`/seller/auth`** — vendor login/signup, branded "Sell on SuperApp India". On signup, auto-redirect to `/vendor` onboarding.
- Add a small toggle at the bottom of each page ("Are you a seller? → /seller/auth", "Shop instead → /auth").
- Delivery rider auth stays at `/delivery/auth` (phone OTP) — already separate.

No new role logic — same `user`/`vendor` roles in `user_roles`; the split is purely UX.

---

## 2. Seller can add their own Products & Services

`vendors` exists but there's no catalog UI. Build it on top of the existing `vendor_products` table.

New seller dashboard tabs under `/vendor`:
- **Overview** (current stats, cleaned up)
- **Products** — list / add / edit / delete. Fields: name, category, price, MRP, stock, description, images (Supabase Storage bucket `vendor-products`, public read), is_active.
- **Services** — same shape but `kind='service'`, with duration + service area instead of stock.
- **Orders** (placeholder list, wired to `orders.vendor_id`)
- **Payouts** (placeholder)

Gated by `kyc_status='approved'` — pending vendors see the form but can't publish.

---

## 3. Cleaner Seller Dashboard

Redesign `/vendor`:
- Left sidebar (Overview / Products / Services / Orders / Payouts / Profile) matching admin's pattern.
- Top header: business name + KYC pill + "Add product" CTA.
- Stat cards: live counts from DB (products, active services, today's orders, pending payout).
- Empty states with one clear action each.

---

## 4. Real-time Delivery flow with Google Maps + Dijkstra

Replace the toy assignment with a proper routing layer.

- **Google Maps connector** — connect via `standard_connectors--connect` (`google_maps`). Use the browser key for the rider map; use the gateway for Distance Matrix / Directions.
- **Rider live location** — rider app pushes `current_lat/lng` every 15s to `delivery_partners` while `is_online=true` (browser geolocation).
- **Assignment algorithm** — server fn `assignRider(orderId)`:
  1. Fetch all approved + online + free riders in the same city.
  2. Build a weighted graph: nodes = pickup, dropoff, candidate riders; edges = road-distance from Google Distance Matrix.
  3. Run **Dijkstra's shortest path** from pickup → dropoff via each rider, pick the rider with the lowest total ETA cost.
  4. Insert `delivery_assignments` row + broadcast on Realtime.
- **Rider screen** — embedded Google Map with pickup pin, drop pin, live polyline from Directions API, turn-by-turn ETA, status buttons (Accept → Picked up → Delivered).
- **Customer screen** — `/orders/$id/track` shows rider's live marker on the map.

Note: Dijkstra here runs over a small graph (rider × stop matrix from Google), not raw map tiles — Google owns the road graph.

---

## 5. Admin-managed Sliding Banner on Home

`banners` table already exists. Wire it up:
- **Admin** — new `/admin/banners` page: upload image, title, subtitle, link URL, sort order, active toggle (bucket `banners`, public).
- **Home** — replace the static promo strip with an auto-sliding carousel (embla, 4s interval, swipeable). Pulls active banners ordered by `sort_order`.
- Seed 5 starter banners with AI-generated images: delivery rider on scooter, fresh fruits crate, vegetable market, multi-category collage, festive offers.

---

## 6. Categories — replace icons with real images

- Add `image_url` to `categories` (already there as `icon_url` — repurpose / rename in UI).
- Generate photographic tiles for each category (groceries, food, fashion, electronics, pharmacy, beauty, travel, mobility).
- Home + `/categories` render image tiles (rounded, gradient overlay, label on top) instead of lucide icons.

---

## 7. Replace "PO" section with "SuperApp Services" hub

The home strip currently labeled "Partner Offers / PO" becomes **SuperApp Services** — a horizontally scrollable rail of service names (not opened cards). Tap a service → opens its detail / booking page.

Initial services: Concierge, Home Cleaning, Laundry, Plumber, Electrician, Salon at Home, Tutor, Courier.

Stored in a new `services` table (name, slug, icon, short_desc, base_price, active). Admin gets `/admin/services` to manage.

---

## 8. Rebrand → "SuperApp India"

- All "SuperApp" labels → "SuperApp India" (header, admin header, vendor header, rider header, auth pages, page titles, OG tags).
- New logo: wordmark "SuperApp" with a small "India" tricolor accent badge. Generate as transparent PNG, swap in `app-shell`, `admin.tsx`, `delivery.tsx`, `vendor.tsx`.

---

## Technical summary

**DB (one migration):**
- `vendor_products`: add `kind` ('product'|'service'), `images jsonb`, `duration_minutes`, `service_area`.
- `services` table (+ GRANTs + RLS: public read, admin write).
- `delivery_partners`: add `last_location_at timestamptz`.
- `categories.image_url` (text) — backfill from generated images.
- Storage buckets: `vendor-products` (public), `banners` (public), `services` (public).

**Connectors:**
- `google_maps` (browser key for map widget; gateway for Distance Matrix + Directions).

**New routes:**
- `/seller/auth`, `/vendor/products`, `/vendor/services`, `/vendor/orders`, `/vendor/payouts`
- `/admin/banners`, `/admin/services`
- `/orders/$id/track`

**New server fns:**
- `assignRider` (Dijkstra + Distance Matrix)
- `updateRiderLocation`
- `getDirections` (proxied through gateway)

**Frontend:**
- Embla carousel for banners.
- `@vis.gl/react-google-maps` (or raw JS API) for rider + tracking maps.
- Image-based category tiles.

---

## Questions before I build

1. **Google Maps** — okay to connect the managed connector now? (Required for routing + live map.)
2. **Dijkstra choice confirmed?** Alternative is simpler nearest-rider-by-ETA from Distance Matrix (one call, no graph). Dijkstra is meaningful only when we have multi-leg routes (multiple stops). Want me to keep Dijkstra anyway as you asked, or switch to single-call nearest-ETA?
3. **Seller products** — should they appear in the buyer app search/category pages immediately on publish, or only after admin approves each listing?
4. **Banner carousel** — autoplay 4s + manual swipe (default), or static grid that user scrolls?

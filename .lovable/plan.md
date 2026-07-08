
## 1. Remove all third-party vendor UI

Third-party affiliate stuff (Swiggy/Blinkit-style partners) is still on the home and in admin. Strip it end to end so only local shops + services remain.

- `src/routes/index.tsx`: delete the unused `FeaturedPartners` function (already not rendered) so it can't come back.
- `src/routes/admin.tsx`: remove **Partners**, **UTM Links**, and **ONDC** nav items.
- Delete route files: `src/routes/admin.partners.tsx`, `src/routes/admin.links.tsx`, `src/routes/admin.ondc.tsx`, `src/routes/p.$partner.tsx`, `src/routes/r.$shortCode.tsx`.
- `src/routes/admin.index.tsx`: drop the Partners / Links / Clicks / Conversions / GMV stats block; keep vendor + rider KPIs only.
- Data stays in DB (partners / affiliate_links / conversions tables) but has no UI surface anymore — no migration needed.

## 2. Rider email/password login actually works

Auth logs show only stale refresh tokens — no failed sign-in. Symptom is probably "signed up but sign-in says invalid" because `auto_confirm_email` was toggled off at some point.

- Call `supabase--configure_auth` with `auto_confirm_email: true` (rider + customer both benefit; no email verification step).
- `src/routes/delivery.auth.tsx`: after successful `signUp`, immediately call `signInWithPassword` as a fallback (handles the "session not returned" case), then navigate. Surface the real Supabase error message on failure instead of eating it.
- After sign-in, if the rider has no `delivery_partners` row yet, redirect to `/delivery/onboarding` instead of `/delivery` (prevents blank dashboard).

## 3. Customer can see the assigned rider + live location

Tracking page already has rider card + `LiveMap`, but it only shows when `delivery_partner_id` is set. Two gaps:

- `src/routes/orders.tsx` (Active list): each active order card gets a compact rider strip (name · vehicle · Call button) plus a "Live map" toggle that expands the `LiveMap` inline — no need to open Track for a quick glance.
- `src/routes/orders.$id.track.tsx`: the rider realtime channel currently filters on nothing; scope it to `filter: user_id=eq.<rider_id>` so location pings arrive without flooding. Also show the pickup pin (vendor lat/lng) on the same map alongside the rider emoji.

## 4. Services admin — proper page with image uploads + preview

Services table already has `image_url`. Admin UI never lets you upload one, so home service cards look plain.

- Create storage bucket `service-images` (public read, authed write) via migration.
- `src/routes/admin.services.tsx`: rebuild card layout — larger cover image, upload button (uses `service-images` bucket, stores public URL in `image_url`), edit dialog (name / desc / price / icon / image / sort), delete confirm. Show live count and "Hidden" chip.
- `src/routes/index.tsx` `ServicesRail`: when `image_url` is set, render an image-forward tile (thumbnail + name + from-price) instead of the icon-only pill. Fallback to icon when no image.
- `src/routes/services.$slug.tsx`: use `image_url` as the hero banner if present.

## Technical details

**Files created**
- `supabase/migrations/<ts>_service_images_bucket.sql` — `insert into storage.buckets` for `service-images` + storage policies (public select, admin insert/update/delete via `has_role`).

**Files edited**
- `src/routes/index.tsx` (drop FeaturedPartners, service tile redesign)
- `src/routes/admin.tsx` (nav trim)
- `src/routes/admin.index.tsx` (KPI trim)
- `src/routes/admin.services.tsx` (image upload + edit)
- `src/routes/services.$slug.tsx` (hero image)
- `src/routes/delivery.auth.tsx` (post-signup auto sign-in + onboarding redirect + surfaced errors)
- `src/routes/orders.tsx` (inline rider strip + live-map toggle)
- `src/routes/orders.$id.track.tsx` (realtime filter, pickup pin)

**Files deleted**
- `src/routes/admin.partners.tsx`, `src/routes/admin.links.tsx`, `src/routes/admin.ondc.tsx`, `src/routes/p.$partner.tsx`, `src/routes/r.$shortCode.tsx`

**Auth config**
- `auto_confirm_email: true`, `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: false`

**Out of scope**
- No changes to vendor orders flow (already covered previously).
- No LiveMap changes for `delivery.dashboard.tsx` — already added.
- Not deleting the `partners`/`affiliate_links` DB tables (kept in case you re-enable later).

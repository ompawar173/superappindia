
## Decisions (chosen for you)

- **Rider signup removed.** `/delivery/auth` becomes a login-only page that accepts **Rider ID + Password**. `/delivery/onboarding` is deleted. Admin creates every rider.
- **Rider ID format:** `RDR-XXXXXX` (6 random alphanumeric chars, unique). Shown everywhere, used to log in.
- **Order ID:** Add a new human-readable `order_number` column like `SA-000123` (sequential, unique). Internal UUID stays as primary key. Displayed to customer, vendor, rider, admin.
- **Login credential mapping:** Admin creates rider → system provisions a synthetic Supabase auth email `<riderid>@riders.superapp.local` with a temp password. Rider types only Rider ID + Password; the login screen maps ID → synthetic email before calling Supabase. Passwords stored via Supabase Auth (bcrypt) — no plaintext anywhere.

## What ships

### 1. Database (one migration)

- `delivery_partners`: add `rider_code TEXT UNIQUE`, `is_disabled BOOLEAN DEFAULT false`, `must_change_password BOOLEAN DEFAULT true`, `created_by UUID`.
- `orders`: add `order_number TEXT UNIQUE` (backfilled), populated by a `BEFORE INSERT` trigger using a sequence → `SA-000001`, `SA-000002`, …
- New RPC `admin_create_rider(...)` (SECURITY DEFINER, admin-only): validates admin caller, generates unique `rider_code`, calls Auth admin to create user with synthetic email + temp password, inserts `delivery_partners` row with `kyc_status='approved'`, inserts `user_roles` row. Returns `{ rider_code, temp_password }` shown once.
- New RPC `admin_reset_rider_password(user_id)` (admin-only): generates new temp password, resets via Auth admin, sets `must_change_password=true`, returns password once.
- New RPC `admin_set_rider_disabled(user_id, disabled)` and `admin_delete_rider(user_id)`.
- New RPC `admin_assign_order(order_id, rider_user_id)` (admin-only): sets `delivery_partner_id`, creates `delivery_assignments` row with status `assigned`.
- Tighten RLS: riders may read/update ONLY orders where `delivery_partner_id = auth.uid()`. Disabled riders can't log in (checked in login flow + `is_disabled` guard on assignment claims).
- Grants + RLS follow the standard template.

### 2. Rider flows

- **`/delivery/auth`** — Rider ID + Password form only. Resolves ID → synthetic email, calls `signInWithPassword`. If `must_change_password`, redirects to `/delivery/change-password` before dashboard.
- **`/delivery/change-password`** — new page; forces password update via `supabase.auth.updateUser`, then clears `must_change_password`.
- **`/delivery/dashboard`** — unchanged core, but shows Rider ID prominently; "Available Pickups" tab REMOVED (admin assigns).
- **`/delivery/onboarding`** — deleted (route + link).
- Sign-up toggle removed from auth page.
- Existing self-registered riders keep working; admin can migrate them by issuing them a `rider_code` from the admin page.

### 3. Admin — Rider Management (`/admin/delivery` redesigned)

- Table of all riders: Rider ID, name, city, vehicle, status chip (Active / Disabled / Pending KYC), today's trips, rating.
- **Create rider** dialog: name, phone, city, vehicle. On submit → calls `admin_create_rider`, shows a one-time modal with Rider ID + temp password + copy buttons.
- Row actions: **Edit** (name/phone/city/vehicle), **Reset password** (shows new temp password once), **Disable/Enable**, **Delete** (confirm).
- Existing "Applications" tab is hidden (no more self-apply).

### 4. Admin — Order Management (new `/admin/orders`)

Clean, professional layout:

```text
┌─ Filters: [All] [Pending] [Accepted] [Picked up] [Delivered] [Cancelled]  Search: order # / phone
├─ Table
│   Order#     Customer         Vendor            Total    Payment   Delivery      Rider           Actions
│   SA-000123  Rahul • 98xxx    Sharma Kirana     ₹540     Paid      Out for del.  RDR-K7X2P9 ▾    View
```

- Click a row → side panel with full details: items, shipping address, payment status, timestamps, current rider, action buttons.
- **Assign rider** dropdown (only online, active, same-city riders shown) → `admin_assign_order`.
- Status filter chips + free-text search over `order_number` and customer phone.
- Add to admin sidebar.

### 5. Order visibility everywhere

- Customer `/orders` and `/orders/$id/track`: show `SA-000123` instead of UUID slice; show rider name + Rider ID + phone once assigned.
- Vendor `/vendor/orders`: show `order_number` on every card.
- Rider dashboard: show `order_number` on active card and history.

### 6. Security

- All admin RPCs check `has_role(auth.uid(), 'admin' OR 'super_admin')` and raise if not.
- Passwords never touch app code paths beyond the one-time display after generation.
- `rider_code` unique constraint + `order_number` unique constraint prevent duplicates at DB level.
- Synthetic rider emails live in the reserved `.local` TLD (never routable).
- Disabled riders: login RPC returns "account disabled"; RLS assignment policies exclude them.

## Out of scope this pass

- SMS/email delivery of temp password (shown in admin UI, admin communicates it).
- Editing an already-assigned order's rider (can unassign + reassign via the same dialog).
- Rider mobile push notifications.

## Files touched

- Migration: 1 new
- New: `src/routes/admin.orders.tsx`, `src/routes/delivery.change-password.tsx`, `src/lib/admin-riders.functions.ts`
- Rewritten: `src/routes/delivery.auth.tsx`, `src/routes/admin.delivery.tsx`
- Updated: `src/routes/admin.tsx` (nav), `src/routes/orders.tsx`, `src/routes/orders.$id.track.tsx`, `src/routes/vendor.orders.tsx`, `src/routes/delivery.dashboard.tsx`, `src/routes/delivery.assignments.tsx`, `src/components/app-shell.tsx` (drop onboarding link)
- Deleted: `src/routes/delivery.onboarding.tsx`, `src/routes/delivery.available.tsx`

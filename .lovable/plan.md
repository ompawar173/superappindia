# Delivery Partner Module — Plan

Add a third role alongside User and Vendor: **Delivery Partner** (rider). They self-onboard, upload KYC, get approved by admin, then receive order assignments from own-services orders.

## 1. Scope (v1)

- Rider sign up / sign in via **phone OTP** (Supabase phone auth)
- Onboarding form + document uploads (Aadhaar, PAN, DL, RC, vehicle photo, profile photo)
- Admin approval / rejection with reason
- Rider dashboard: availability toggle, current assignment, history, earnings
- Auto/manual assignment of own-service orders to approved + online riders
- Status flow: `assigned → accepted → picked_up → delivered` (or `rejected/cancelled`)
- Admin view of all riders, live status, assignment override

**Out of scope v1:** live GPS tracking on map, route optimization, COD reconciliation, surge pricing, rider chat.

## 2. New role & auth

- Extend `app_role` enum with `delivery` (migration).
- Phone OTP enabled in Supabase auth config; email/password stays for users/vendors/admin.
- New route surface `/delivery/*` (separate from `/vendor` and `/admin`) with its own gate using `useRoles().roles.includes('delivery')`.
- Auth screen `/delivery/auth` — phone + OTP only.

## 3. Database (new tables)

```text
delivery_partners
  user_id (PK→auth.users), full_name, phone, city, vehicle_type (bike|scooter|cycle|car),
  vehicle_number, kyc_status (pending|approved|rejected), kyc_rejection_reason,
  is_online (bool), current_lat, current_lng, last_seen_at, rating, total_deliveries,
  created_at, updated_at

delivery_documents
  id, partner_id→delivery_partners, doc_type (aadhaar|pan|dl|rc|vehicle_photo|selfie),
  storage_path, verified (bool), uploaded_at

delivery_assignments
  id, order_id→orders, partner_id→delivery_partners,
  status (assigned|accepted|rejected|picked_up|delivered|cancelled),
  assigned_at, accepted_at, picked_up_at, delivered_at,
  payout_amount, distance_km, notes

delivery_earnings_ledger
  id, partner_id, assignment_id, amount, type (delivery_fee|tip|bonus|adjustment),
  created_at
```

- `orders` gains `delivery_partner_id` + `delivery_status` columns.
- RLS: rider sees only own rows; admin via `has_role('admin')`; service_role for assignment server fn.
- Storage bucket `delivery-kyc` (private) with RLS — partner can upload/read own files, admin can read all.
- GRANT block on every public table per project rules.

## 4. Pages

**Rider app (`/delivery/*`)**
- `/delivery/auth` — phone OTP
- `/delivery/onboarding` — multi-step: personal → vehicle → documents → submit
- `/delivery` — dashboard: online toggle, active assignment card, today's earnings, weekly chart
- `/delivery/assignments` — history list + filters
- `/delivery/earnings` — ledger + payout summary
- `/delivery/profile` — edit details, re-upload rejected docs

**Admin additions**
- `/admin/delivery` — list riders (filter by KYC status, city, online), approve/reject with reason
- `/admin/delivery/$id` — partner detail, document viewer, assignment history, manual reassign
- `/admin/orders` already exists — add assignment column and "assign rider" action

## 5. Assignment flow (own-service orders only — affiliate/ONDC excluded in v1)

1. New order with `fulfillment = 'own'` and status `paid` → trigger calls server fn `assignRider(orderId)`.
2. `assignRider` (service role): picks nearest approved + online + free rider in same city (simple distance sort; falls back to round-robin if no geo).
3. Inserts `delivery_assignments` row (status `assigned`), updates `orders.delivery_partner_id`, broadcasts via Supabase realtime.
4. Rider sees push-in-app card → accept/reject (60s timer). Reject → re-run assignment, skip this rider.
5. State transitions handled by `updateAssignmentStatus` server fn (authenticated, verifies partner owns assignment).
6. On `delivered` → insert earnings ledger row, increment `total_deliveries`.

Realtime channel: `delivery_assignments:partner_id=eq.<uid>` for instant push without polling.

## 6. Server functions / routes

- `src/lib/delivery.functions.ts` — `submitOnboarding`, `uploadKycDoc` (returns signed URL), `setOnlineStatus`, `updateLocation`, `acceptAssignment`, `rejectAssignment`, `updateAssignmentStatus`
- `src/lib/admin-delivery.functions.ts` — `approvePartner`, `rejectPartner`, `manualAssign`, `listPartners` (admin-gated)
- `src/lib/assignment.server.ts` — pure helpers (geo, ranking)
- All protected fns use `requireSupabaseAuth` + role check via `has_role()`.

## 7. Design

Reuse existing green/white system. Rider shell is a mobile-first, single-column layout with a sticky bottom action bar (accept/picked-up/delivered). Big tap targets, prominent online/offline pill in header.

## 8. Build order

1. Migration (role enum + tables + storage bucket + RLS + GRANTs)
2. Phone OTP auth config + `/delivery/auth`
3. Onboarding form + document upload
4. Admin approval UI
5. Rider dashboard + availability toggle
6. Assignment server fn + realtime push to rider
7. Status transitions + earnings ledger
8. Admin order ↔ rider linkage + manual reassign

## Open questions

1. **Phone OTP provider** — Supabase needs an SMS provider (Twilio / MSG91 / Textlocal). Do you already have one, or should I use Supabase's built-in test mode for now and you wire the real provider before launch?
2. **Which orders go to riders?** Confirm: only "own services" orders (e.g., concierge, future grocery), not Swiggy/Zomato affiliate redirects (those use partner's own riders). Correct?
3. **Payout per delivery** — flat ₹ per order, or distance-based (₹ base + ₹/km)? Needed to seed the earnings calc.
4. **Auto-assign vs broadcast-to-many** — assign to one nearest rider with 60s accept window (Uber style), or broadcast to all nearby and first-come (Dunzo style)?

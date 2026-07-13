
-- ============ 1. Duplicate / bypass public policies ============
DROP POLICY IF EXISTS "Links public read" ON public.affiliate_links;
DROP POLICY IF EXISTS "Partners public read" ON public.partners;
DROP POLICY IF EXISTS "Public can read approved active vendors" ON public.vendors;
DROP POLICY IF EXISTS "Products public read" ON public.vendor_products;

-- ============ 2. Column-level anon grants (hide sensitive cols) ============
-- vendors: hide gstin, pan, payout_account, user_id from anon
REVOKE SELECT ON public.vendors FROM anon;
GRANT SELECT (id, business_name, city, address, kyc_status, cover_url, logo_url,
              tagline, category, is_active, rating, open_hours, created_at)
  ON public.vendors TO anon;

-- partners: hide commission_pct, affiliate_network, base_url from anon
REVOKE SELECT ON public.partners FROM anon;
GRANT SELECT (id, slug, name, logo_url, description, category_id, type,
              active, featured, created_at)
  ON public.partners TO anon;

-- affiliate_links: hide utm_*, created_by from anon
REVOKE SELECT ON public.affiliate_links FROM anon;
GRANT SELECT (id, short_code, target_url, active, campaign, partner_id, channel, created_at)
  ON public.affiliate_links TO anon;

-- ============ 3. Riders: no more broad SELECT on unassigned orders ============
DROP POLICY IF EXISTS "Riders see assignable orders" ON public.orders;
CREATE POLICY "Riders see their claimed orders" ON public.orders
  FOR SELECT TO authenticated
  USING (delivery_partner_id = auth.uid());

-- Rider-facing slim list of assignable orders (no full address, no payment_ref)
CREATE OR REPLACE FUNCTION public.list_assignable_orders()
RETURNS TABLE (
  id uuid,
  total numeric,
  created_at timestamptz,
  vendor_id uuid,
  vendor_business_name text,
  vendor_city text,
  item_count int,
  drop_city text,
  drop_pincode text,
  pickup_lat numeric,
  pickup_lng numeric,
  drop_lat numeric,
  drop_lng numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.total,
    o.created_at,
    o.vendor_id,
    v.business_name,
    v.city,
    COALESCE((
      SELECT SUM(COALESCE((x->>'qty')::int, 1))::int
      FROM jsonb_array_elements(o.items) x
    ), 0),
    (o.shipping_address->>'city')::text,
    (o.shipping_address->>'pincode')::text,
    o.pickup_lat, o.pickup_lng, o.drop_lat, o.drop_lng
  FROM public.orders o
  LEFT JOIN public.vendors v ON v.id = o.vendor_id
  WHERE o.delivery_partner_id IS NULL
    AND o.status IN ('accepted','preparing','shipped')
    AND public.is_approved_rider(auth.uid())
  ORDER BY o.created_at DESC
  LIMIT 50;
$$;
REVOKE EXECUTE ON FUNCTION public.list_assignable_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_assignable_orders() TO authenticated;

-- ============ 4. Fix always-true INSERT policy ============
DROP POLICY IF EXISTS "Anyone can apply" ON public.delivery_partner_applications;
CREATE POLICY "Anyone can apply" ON public.delivery_partner_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(full_name, '')) BETWEEN 2 AND 120
    AND char_length(coalesce(phone, '')) BETWEEN 6 AND 20
    AND char_length(coalesce(city, '')) BETWEEN 2 AND 80
    AND char_length(coalesce(vehicle_type, '')) BETWEEN 2 AND 40
  );

-- ============ 5. Lock down SECURITY DEFINER function EXECUTE ============
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_approved_rider(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_approved_rider(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.guard_vendor_order_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_vendor_protected_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_delivery_partner_protected_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

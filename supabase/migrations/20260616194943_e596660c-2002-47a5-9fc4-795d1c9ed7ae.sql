
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS open_hours jsonb DEFAULT '{"open":"09:00","close":"22:00"}'::jsonb;

CREATE TABLE IF NOT EXISTS public.delivery_partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text NOT NULL,
  vehicle_type text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.delivery_partner_applications TO anon, authenticated;
GRANT SELECT, UPDATE ON public.delivery_partner_applications TO authenticated;
GRANT ALL ON public.delivery_partner_applications TO service_role;
ALTER TABLE public.delivery_partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can apply" ON public.delivery_partner_applications;
CREATE POLICY "Anyone can apply" ON public.delivery_partner_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage applications" ON public.delivery_partner_applications;
CREATE POLICY "Admins manage applications" ON public.delivery_partner_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE VIEW public.vendors_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, business_name, city, address, tagline, category,
       logo_url, cover_url, rating, is_active, kyc_status, open_hours, created_at
FROM public.vendors
WHERE kyc_status = 'approved' AND COALESCE(is_active, true) = true;
REVOKE ALL ON public.vendors_public FROM PUBLIC;
GRANT SELECT ON public.vendors_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.partners_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, slug, name, logo_url, description, category_id, type, base_url
FROM public.partners
WHERE COALESCE(active, true) = true;
REVOKE ALL ON public.partners_public FROM PUBLIC;
GRANT SELECT ON public.partners_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.affiliate_links_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, short_code, target_url
FROM public.affiliate_links
WHERE COALESCE(active, true) = true;
REVOKE ALL ON public.affiliate_links_public FROM PUBLIC;
GRANT SELECT ON public.affiliate_links_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read approved active vendors" ON public.vendors;
DROP POLICY IF EXISTS "Public can read approved vendors" ON public.vendors;
DROP POLICY IF EXISTS "Anyone can read approved vendors" ON public.vendors;
DROP POLICY IF EXISTS "Approved vendors are public" ON public.vendors;
REVOKE SELECT ON public.vendors FROM anon;

DROP POLICY IF EXISTS "Public can read active partners" ON public.partners;
DROP POLICY IF EXISTS "Anyone can read partners" ON public.partners;
DROP POLICY IF EXISTS "Active partners are public" ON public.partners;
REVOKE SELECT ON public.partners FROM anon;

DROP POLICY IF EXISTS "Public can read active links" ON public.affiliate_links;
DROP POLICY IF EXISTS "Anyone can read links" ON public.affiliate_links;
DROP POLICY IF EXISTS "Active links are public" ON public.affiliate_links;
REVOKE SELECT ON public.affiliate_links FROM anon;

CREATE OR REPLACE FUNCTION public.guard_vendor_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() AND OLD.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.tax IS DISTINCT FROM OLD.tax
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.items IS DISTINCT FROM OLD.items
     OR NEW.payment_ref IS DISTINCT FROM OLD.payment_ref
     OR NEW.external_order_id IS DISTINCT FROM OLD.external_order_id
     OR NEW.shipping_address IS DISTINCT FROM OLD.shipping_address
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.delivery_partner_id IS DISTINCT FROM OLD.delivery_partner_id THEN
    RAISE EXCEPTION 'Vendors may only update status and delivery_status on orders';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_vendor_order_updates ON public.orders;
CREATE TRIGGER guard_vendor_order_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_order_updates();


ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 0;

-- Allow public read of approved + active vendors (safe, non-sensitive columns are queried by code)
DROP POLICY IF EXISTS "Public can view approved active vendors" ON public.vendors;
CREATE POLICY "Public can view approved active vendors"
  ON public.vendors FOR SELECT
  TO anon, authenticated
  USING (kyc_status = 'approved' AND is_active = true);

GRANT SELECT ON public.vendors TO anon;

-- vendor_products public read for active products of approved active vendors
DROP POLICY IF EXISTS "Public can view active products of approved vendors" ON public.vendor_products;
CREATE POLICY "Public can view active products of approved vendors"
  ON public.vendor_products FOR SELECT
  TO anon, authenticated
  USING (
    active = true AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_products.vendor_id
        AND v.kyc_status = 'approved'
        AND v.is_active = true
    )
  );

GRANT SELECT ON public.vendor_products TO anon;

CREATE INDEX IF NOT EXISTS idx_vendors_active_approved ON public.vendors(kyc_status, is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_active ON public.vendor_products(vendor_id, active);

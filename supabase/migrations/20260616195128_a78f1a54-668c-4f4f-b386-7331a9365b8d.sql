
DROP VIEW IF EXISTS public.vendors_public;
DROP VIEW IF EXISTS public.partners_public;
DROP VIEW IF EXISTS public.affiliate_links_public;

GRANT SELECT
  (id, business_name, city, address, tagline, category,
   logo_url, cover_url, rating, is_active, kyc_status, open_hours, created_at)
  ON public.vendors TO anon;

DROP POLICY IF EXISTS "Public can read approved active vendors" ON public.vendors;
CREATE POLICY "Public can read approved active vendors"
  ON public.vendors FOR SELECT TO anon, authenticated
  USING (kyc_status = 'approved' AND COALESCE(is_active, true) = true);

GRANT SELECT
  (id, slug, name, logo_url, description, category_id, type, base_url,
   featured, active, created_at)
  ON public.partners TO anon;

DROP POLICY IF EXISTS "Public can read active partners" ON public.partners;
CREATE POLICY "Public can read active partners"
  ON public.partners FOR SELECT TO anon, authenticated
  USING (COALESCE(active, true) = true);

GRANT SELECT
  (id, short_code, target_url, active, campaign, partner_id)
  ON public.affiliate_links TO anon;

DROP POLICY IF EXISTS "Public can read active links" ON public.affiliate_links;
CREATE POLICY "Public can read active links"
  ON public.affiliate_links FOR SELECT TO anon, authenticated
  USING (COALESCE(active, true) = true);

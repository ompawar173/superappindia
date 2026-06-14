
-- vendor_products: add kind, mrp, service fields
ALTER TABLE public.vendor_products
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product' CHECK (kind IN ('product','service')),
  ADD COLUMN IF NOT EXISTS mrp numeric(12,2),
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS service_area text;

-- categories: add image_url
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

-- delivery_partners: track location update time
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS last_location_at timestamptz;

-- services table (SuperApp own services)
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_desc text,
  icon text,
  image_url text,
  base_price numeric(10,2),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services public read" ON public.services FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed services
INSERT INTO public.services (slug, name, short_desc, icon, base_price, sort_order) VALUES
  ('home-cleaning','Home Cleaning','Deep cleaning by trained pros','Sparkles',499,1),
  ('laundry','Laundry & Dry Clean','Wash, iron & deliver in 24h','Shirt',149,2),
  ('plumber','Plumber','Leak fix, fittings, installations','Wrench',199,3),
  ('electrician','Electrician','Wiring, fans, switches','Zap',199,4),
  ('salon-home','Salon at Home','Haircut, facial, spa at home','Scissors',299,5),
  ('tutor','Home Tutor','Class 1-12, all subjects','GraduationCap',399,6),
  ('courier','Quick Courier','Same-city pickup & drop','Package',79,7),
  ('concierge','Concierge','We handle errands for you','HandHeart',249,8)
ON CONFLICT (slug) DO NOTHING;

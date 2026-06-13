
-- Add 'delivery' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery';

-- Status enums
DO $$ BEGIN
  CREATE TYPE public.kyc_status_t AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_type_t AS ENUM ('bike','scooter','cycle','car');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_doc_type AS ENUM ('aadhaar','pan','dl','rc','vehicle_photo','selfie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_status_t AS ENUM ('assigned','accepted','rejected','picked_up','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.earning_type_t AS ENUM ('delivery_fee','tip','bonus','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- delivery_partners
CREATE TABLE public.delivery_partners (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  vehicle_type public.vehicle_type_t NOT NULL,
  vehicle_number text NOT NULL,
  kyc_status public.kyc_status_t NOT NULL DEFAULT 'pending',
  kyc_rejection_reason text,
  is_online boolean NOT NULL DEFAULT false,
  current_lat double precision,
  current_lng double precision,
  last_seen_at timestamptz,
  rating numeric(3,2) DEFAULT 5.00,
  total_deliveries int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.delivery_partners TO authenticated;
GRANT ALL ON public.delivery_partners TO service_role;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider sees self" ON public.delivery_partners FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "rider inserts self" ON public.delivery_partners FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rider updates self limited" ON public.delivery_partners FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_dp_updated BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- delivery_documents
CREATE TABLE public.delivery_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.delivery_partners(user_id) ON DELETE CASCADE,
  doc_type public.delivery_doc_type NOT NULL,
  storage_path text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_documents TO authenticated;
GRANT ALL ON public.delivery_documents TO service_role;
ALTER TABLE public.delivery_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider manages own docs" ON public.delivery_documents FOR ALL TO authenticated
  USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- delivery_assignments
CREATE TABLE public.delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.delivery_partners(user_id) ON DELETE CASCADE,
  status public.assignment_status_t NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  payout_amount numeric(10,2) DEFAULT 0,
  distance_km numeric(6,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.delivery_assignments TO authenticated;
GRANT ALL ON public.delivery_assignments TO service_role;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider sees own assignments" ON public.delivery_assignments FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "rider updates own assignments" ON public.delivery_assignments FOR UPDATE TO authenticated
  USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_da_updated BEFORE UPDATE ON public.delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_da_partner ON public.delivery_assignments(partner_id, status);
CREATE INDEX idx_da_order ON public.delivery_assignments(order_id);

-- delivery_earnings_ledger
CREATE TABLE public.delivery_earnings_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.delivery_partners(user_id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.delivery_assignments(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  type public.earning_type_t NOT NULL DEFAULT 'delivery_fee',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.delivery_earnings_ledger TO authenticated;
GRANT ALL ON public.delivery_earnings_ledger TO service_role;
ALTER TABLE public.delivery_earnings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider reads own earnings" ON public.delivery_earnings_ledger FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX idx_del_partner ON public.delivery_earnings_ledger(partner_id, created_at DESC);

-- orders: add delivery columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_partner_id uuid REFERENCES public.delivery_partners(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_status public.assignment_status_t,
  ADD COLUMN IF NOT EXISTS pickup_address jsonb,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS drop_lat double precision,
  ADD COLUMN IF NOT EXISTS drop_lng double precision;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;

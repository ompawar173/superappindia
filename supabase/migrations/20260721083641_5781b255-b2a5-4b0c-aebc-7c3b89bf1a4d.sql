
-- 1. Rider fields
ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS rider_code TEXT,
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Backfill rider_code for existing rows using random 6 char alnum
UPDATE public.delivery_partners
SET rider_code = 'RDR-' || upper(substr(encode(extensions.gen_random_bytes(4),'hex'),1,6))
WHERE rider_code IS NULL;

ALTER TABLE public.delivery_partners
  ALTER COLUMN rider_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS delivery_partners_rider_code_uniq
  ON public.delivery_partners (rider_code);

-- 2. Order number: sequence + trigger
CREATE SEQUENCE IF NOT EXISTS public.orders_seq START 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'SA-' || lpad(nextval('public.orders_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_number ON public.orders;
CREATE TRIGGER trg_orders_set_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Backfill existing orders
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE order_number IS NULL ORDER BY created_at LOOP
    UPDATE public.orders
      SET order_number = 'SA-' || lpad(nextval('public.orders_seq')::text, 6, '0')
      WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uniq
  ON public.orders (order_number);

-- 3. Admin can update orders (needed for assigning riders / cancelling)
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 4. Admin can insert delivery_assignments (for manual assign)
DROP POLICY IF EXISTS "Admins insert assignments" ON public.delivery_assignments;
CREATE POLICY "Admins insert assignments" ON public.delivery_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins delete assignments" ON public.delivery_assignments;
CREATE POLICY "Admins delete assignments" ON public.delivery_assignments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 5. RPC that resolves rider_code -> synthetic auth email for login
-- Runs as anon (before sign-in); reveals only email string for a valid rider_code.
CREATE OR REPLACE FUNCTION public.rider_login_email(_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid UUID; _disabled BOOLEAN; _email TEXT;
BEGIN
  SELECT user_id, is_disabled INTO _uid, _disabled
  FROM public.delivery_partners WHERE rider_code = upper(_code);
  IF _uid IS NULL THEN RETURN NULL; END IF;
  IF _disabled THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE = 'P0001'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  RETURN _email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rider_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_login_email(TEXT) TO anon, authenticated;

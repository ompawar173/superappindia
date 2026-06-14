
-- 1. Vendors: block self-modification of kyc_status via trigger
CREATE OR REPLACE FUNCTION public.guard_vendor_protected_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct THEN
    RAISE EXCEPTION 'Vendors cannot modify kyc_status or commission_pct';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_vendor_protected_fields ON public.vendors;
CREATE TRIGGER guard_vendor_protected_fields
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_protected_fields();

-- 2. Delivery partners: block self-modification of KYC / rating / total_deliveries
CREATE OR REPLACE FUNCTION public.guard_delivery_partner_protected_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.kyc_rejection_reason IS DISTINCT FROM OLD.kyc_rejection_reason
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.total_deliveries IS DISTINCT FROM OLD.total_deliveries THEN
    RAISE EXCEPTION 'Riders cannot modify KYC, rating, or total_deliveries fields';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_delivery_partner_protected_fields ON public.delivery_partners;
CREATE TRIGGER guard_delivery_partner_protected_fields
  BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.guard_delivery_partner_protected_fields();

-- 3. conversions: revoke client write access; writes only via service_role server fn
REVOKE INSERT, UPDATE, DELETE ON public.conversions FROM anon, authenticated;

-- 4. link_clicks: revoke client write access; tracking happens via server fn
REVOKE INSERT, UPDATE, DELETE ON public.link_clicks FROM anon, authenticated;

-- 5. has_role: restrict EXECUTE to roles that need it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 6. Realtime broadcast/presence: require topic to match auth.uid()
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own realtime topic" ON realtime.messages;
CREATE POLICY "Users read own realtime topic"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'rider:' || auth.uid()::text || '%'
    OR realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
  );

DROP POLICY IF EXISTS "Users write own realtime topic" ON realtime.messages;
CREATE POLICY "Users write own realtime topic"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'rider:' || auth.uid()::text || '%'
    OR realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
  );

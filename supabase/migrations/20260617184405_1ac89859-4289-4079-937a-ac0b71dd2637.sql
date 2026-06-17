
-- Helper: approved rider check
CREATE OR REPLACE FUNCTION public.is_approved_rider(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_partners
    WHERE user_id = _user_id AND kyc_status = 'approved'
  )
$$;

-- Allow approved riders to see the available pool + their own claimed orders
DROP POLICY IF EXISTS "Riders see assignable orders" ON public.orders;
CREATE POLICY "Riders see assignable orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  public.is_approved_rider(auth.uid())
  AND (delivery_partner_id IS NULL OR delivery_partner_id = auth.uid())
);

-- Allow approved riders to claim an unassigned order or update their own
DROP POLICY IF EXISTS "Riders update assignable orders" ON public.orders;
CREATE POLICY "Riders update assignable orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.is_approved_rider(auth.uid())
  AND (delivery_partner_id IS NULL OR delivery_partner_id = auth.uid())
)
WITH CHECK (
  public.is_approved_rider(auth.uid())
  AND delivery_partner_id = auth.uid()
);

-- Relax the guard trigger so riders can self-claim and progress their delivery
CREATE OR REPLACE FUNCTION public.guard_vendor_order_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  -- Customer editing own order
  IF NEW.user_id = auth.uid() AND OLD.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  -- Rider claiming an unassigned order (or updating their own delivery)
  IF NEW.delivery_partner_id = auth.uid()
     AND (OLD.delivery_partner_id IS NULL OR OLD.delivery_partner_id = auth.uid()) THEN
    -- Riders may only touch delivery_* fields
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.tax IS DISTINCT FROM OLD.tax
       OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.items IS DISTINCT FROM OLD.items
       OR NEW.payment_ref IS DISTINCT FROM OLD.payment_ref
       OR NEW.external_order_id IS DISTINCT FROM OLD.external_order_id
       OR NEW.shipping_address IS DISTINCT FROM OLD.shipping_address
       OR NEW.source IS DISTINCT FROM OLD.source THEN
      RAISE EXCEPTION 'Riders may only update delivery fields';
    END IF;
    RETURN NEW;
  END IF;
  -- Vendor: status / delivery_status only
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

DROP TRIGGER IF EXISTS guard_vendor_order_updates_t ON public.orders;
CREATE TRIGGER guard_vendor_order_updates_t
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_order_updates();

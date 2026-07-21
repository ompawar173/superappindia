
-- Give order_number a DEFAULT so it's optional in the Insert type
ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT ('SA-' || lpad(nextval('public.orders_seq')::text, 6, '0'));

-- Trigger still fine (idempotent when value present); keep it as belt-and-braces.

-- Tighten SECURITY DEFINER access on internal helpers
REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM PUBLIC, anon, authenticated;

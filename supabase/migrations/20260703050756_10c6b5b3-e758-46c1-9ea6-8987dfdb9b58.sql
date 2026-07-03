CREATE OR REPLACE FUNCTION public.guard_vendor_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Vendors cannot modify kyc_status';
  END IF;
  RETURN NEW;
END $function$;
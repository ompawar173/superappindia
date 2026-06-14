
REVOKE EXECUTE ON FUNCTION public.guard_vendor_protected_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_delivery_partner_protected_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

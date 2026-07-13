
DROP POLICY IF EXISTS "Services public read" ON public.services;
CREATE POLICY "Services active public read" ON public.services FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Services admin read all" ON public.services FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;


-- Service requests table
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_slug TEXT,
  service_name TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  pincode TEXT,
  scheduled_for TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own requests" ON public.service_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Users create own requests" ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update requests" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER service_requests_updated_at BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_requests_status ON public.service_requests(status, created_at DESC);
CREATE INDEX idx_service_requests_user ON public.service_requests(user_id, created_at DESC);

-- Seed common local services (idempotent)
INSERT INTO public.services (slug, name, short_desc, icon, base_price, sort_order, active) VALUES
  ('plumber','Plumber','Taps, leaks, fittings & pipe repair','Wrench',199,10,true),
  ('electrician','Electrician','Wiring, switches, fans & appliances','Zap',249,11,true),
  ('ac-repair','AC Repair & Service','Split/window AC cleaning & repair','Snowflake',499,12,true),
  ('house-cleaning','House Cleaning','Deep cleaning & regular housekeeping','Sparkles',699,13,true),
  ('cook-at-home','Cook at Home','Home cook for daily meals','ChefHat',299,14,true),
  ('salon-at-home','Salon at Home','Beauty & grooming at your door','Scissors',399,15,true),
  ('pest-control','Pest Control','Cockroach, termite & mosquito control','Bug',899,16,true),
  ('appliance-repair','Appliance Repair','Washing machine, fridge, microwave','Settings',349,17,true)
ON CONFLICT (slug) DO NOTHING;

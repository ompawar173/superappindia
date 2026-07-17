import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Shield } from "lucide-react";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/services/$slug")({
  component: ServiceDetail,
  notFoundComponent: () => (
    <AppShell><div className="p-10 text-center text-muted-foreground">Service not found.</div></AppShell>
  ),
  errorComponent: () => (
    <AppShell><div className="p-10 text-center text-destructive">Couldn't load service.</div></AppShell>
  ),
});

function ServiceDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", pincode: "", scheduled_for: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) return <AppShell><div className="p-10 text-center text-muted-foreground">Loading…</div></AppShell>;
  if (!service) return null;
  const Icon = (Icons as any)[service.icon ?? "Sparkles"] ?? Icons.Sparkles;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill name, phone and address");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("service_requests").insert({
      user_id: user.id,
      service_id: service.id,
      service_slug: service.slug,
      service_name: service.name,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      scheduled_for: form.scheduled_for || null,
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Request submitted. Our team will call you shortly.");
    setForm({ name: "", phone: "", address: "", city: "", pincode: "", scheduled_for: "", notes: "" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
          {service.image_url && (
            <div className="relative aspect-[16/8] bg-muted">
              <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="h-8 w-8" />
              </span>
              <div className="flex-1">
                <h1 className="font-display text-2xl font-bold">{service.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{service.short_desc}</p>
                {service.base_price && (
                  <p className="mt-3 font-display text-xl font-bold text-primary">
                    Starting at ₹{Number(service.base_price)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <Perk icon={Clock} label="On-time" />
              <Perk icon={Shield} label="Verified pros" />
              <Perk icon={CheckCircle2} label="100% safe" />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold">Request this service</h2>
          <p className="text-xs text-muted-foreground">Fill the form and our team will call you within 10 minutes.</p>
          {!user && (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm">
              Please <Link to="/auth" className="text-primary underline">sign in</Link> to place a request.
            </div>
          )}
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><Label>Your name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            <div className="sm:col-span-2"><Label>Address *</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Preferred date & time</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Tell us more about what you need…" /></div>
            <Button type="submit" disabled={submitting || !user} className="rounded-full sm:col-span-2">
              {submitting ? "Submitting…" : `Request ${service.name}`}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function Perk({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  );
}

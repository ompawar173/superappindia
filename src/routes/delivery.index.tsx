import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Clock, IndianRupee, MapPinned, ShieldCheck, Truck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/delivery/")({ component: DeliveryLanding });

function DeliveryLanding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If a signed-in user already has a partner row, send them to the dashboard.
  const { data: partner } = useQuery({
    queryKey: ["rider-existing", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("delivery_partners").select("id,kyc_status").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  if (!loading && user && partner) {
    navigate({ to: "/delivery/dashboard" });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-soft/40 to-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-display text-lg font-bold">SuperApp India</Link>
          <Link to="/delivery/auth" className="text-sm font-medium text-primary hover:underline">Already a partner? Sign in →</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Bike className="h-3.5 w-3.5" /> Earn with SuperApp India
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
              Ride, deliver, <span className="text-primary">earn weekly.</span>
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Join thousands of riders earning on SuperApp India. Flexible hours, instant orders, transparent payouts straight to your bank.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              <Highlight icon={IndianRupee} title="₹500–₹1,200 / day" desc="Average rider take-home" />
              <Highlight icon={Wallet} title="Weekly payouts" desc="Every Monday, no waiting" />
              <Highlight icon={Clock} title="Choose your hours" desc="Work mornings, evenings or all day" />
              <Highlight icon={ShieldCheck} title="Free insurance" desc="On-trip cover included" />
            </ul>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-elevated">
            <h2 className="font-display text-xl font-bold">Apply in 60 seconds</h2>
            <p className="mt-1 text-sm text-muted-foreground">Our team reviews every application within 24 hours.</p>
            <ApplyForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Step n={1} icon={MapPinned} title="Apply" desc="Fill the form. We'll call you for a quick verification." />
          <Step n={2} icon={Truck} title="Onboard" desc="Upload your documents. Get your rider kit." />
          <Step n={3} icon={IndianRupee} title="Start earning" desc="Go online from the rider app and accept orders." />
        </div>
      </section>
    </div>
  );
}

function Highlight({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

function Step({ n, icon: Icon, title, desc }: { n: number; icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="mt-2 font-display font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function ApplyForm() {
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", city: "", vehicle_type: "bike", notes: "" });
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("delivery_partner_applications").insert(form);
      if (error) throw error;
    },
    onSuccess: () => { setDone(true); toast.success("Application received! We'll reach out within 24h."); },
    onError: (e: any) => toast.error(e.message ?? "Could not submit"),
  });

  if (done) {
    return (
      <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-success" />
        <p className="mt-2 font-semibold">You're on the list!</p>
        <p className="text-sm text-muted-foreground">We'll call {form.phone} within 24 hours.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">← Back to app</Link>
      </div>
    );
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label>Vehicle</Label>
        <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bike">Motorbike</SelectItem>
            <SelectItem value="scooter">Scooter</SelectItem>
            <SelectItem value="bicycle">Bicycle</SelectItem>
            <SelectItem value="car">Car</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Anything we should know? (optional)</Label>
        <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full rounded-full">
        {mut.isPending ? "Submitting…" : "Apply now"}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Already approved? <Link to="/delivery/auth" className="text-primary hover:underline">Sign in to rider app</Link>
      </p>
    </form>
  );
}

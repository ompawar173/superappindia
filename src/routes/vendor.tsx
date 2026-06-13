import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, ShieldCheck, Package, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/vendor")({ component: VendorPage });

function VendorPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: vendor, refetch } = useQuery({
    queryKey: ["vendor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  if (!user) return null;
  if (!vendor) return <VendorOnboarding onCreated={refetch} />;
  return <VendorDashboard vendor={vendor} />;
}

function VendorOnboarding({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("vendors").insert({
      user_id: user!.id, business_name: business, city, gstin: gstin || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Vendor profile submitted. KYC pending admin review.");
    qc.invalidateQueries({ queryKey: ["vendor"] });
    onCreated();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Store className="h-6 w-6" /></span>
          <div>
            <h1 className="font-display text-2xl font-bold">Sell on SuperApp</h1>
            <p className="text-sm text-muted-foreground">List your business and reach millions of customers.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div>
            <Label htmlFor="business">Business name</Label>
            <Input id="business" value={business} onChange={(e) => setBusiness(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN (optional)</Label>
            <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </div>
          <Button disabled={loading} type="submit" className="w-full rounded-full">
            {loading ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function VendorDashboard({ vendor }: { vendor: any }) {
  const statusColor =
    vendor.kyc_status === "approved" ? "bg-success text-success-foreground"
    : vendor.kyc_status === "rejected" ? "bg-destructive text-destructive-foreground"
    : "bg-warning text-warning-foreground";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Vendor</p>
              <h1 className="font-display text-2xl font-bold">{vendor.business_name}</h1>
              <p className="text-sm text-muted-foreground">{vendor.city}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor}`}>
              KYC: {vendor.kyc_status}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatTile icon={Package} label="Products" value="0" />
          <StatTile icon={ShieldCheck} label="Orders" value="0" />
          <StatTile icon={Wallet} label="Payout (₹)" value="0" />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          <p>Catalog and order management UI launches once KYC is approved by admin.</p>
          <Link to="/account" className="mt-2 inline-block text-primary hover:underline">← Back to account</Link>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}

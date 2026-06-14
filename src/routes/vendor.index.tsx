import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, ReceiptText, Store, TrendingUp, Wallet, Wrench, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/vendor/")({ component: VendorOverviewPage });

function VendorOverviewPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: vendor, refetch } = useQuery({
    queryKey: ["vendor", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  if (!vendor) return <VendorOnboarding onCreated={() => { refetch(); qc.invalidateQueries({ queryKey: ["vendor"] }); }} />;
  return <VendorOverview vendor={vendor} />;
}

function VendorOnboarding({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("vendors").insert({
      user_id: user!.id, business_name: business, city, gstin: gstin || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Vendor profile submitted. KYC pending admin review.");
    onCreated();
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Store className="h-6 w-6" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold">Sell on SuperApp India</h1>
          <p className="text-sm text-muted-foreground">Tell us about your business to start listing.</p>
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
  );
}

function VendorOverview({ vendor }: { vendor: any }) {
  const { data: stats } = useQuery({
    queryKey: ["vendor-stats", vendor.id],
    queryFn: async () => {
      const [prods, services, orders] = await Promise.all([
        supabase.from("vendor_products").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("kind", "product"),
        supabase.from("vendor_products").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("kind", "service"),
        supabase.from("orders").select("total").eq("vendor_id", vendor.id),
      ]);
      const ordersList = (orders.data ?? []) as any[];
      return {
        products: prods.count ?? 0,
        services: services.count ?? 0,
        orderCount: ordersList.length,
        revenue: ordersList.reduce((s, o) => s + Number(o.total ?? 0), 0),
      };
    },
  });

  const s = stats ?? { products: 0, services: 0, orderCount: 0, revenue: 0 };
  const isApproved = vendor.kyc_status === "approved";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-2xl font-bold">{vendor.business_name}</h1>
        <p className="text-sm text-muted-foreground">{vendor.city}{vendor.gstin ? ` · GSTIN ${vendor.gstin}` : ""}</p>
      </header>

      {!isApproved && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-semibold">KYC {vendor.kyc_status}</p>
          <p className="text-muted-foreground">
            {vendor.kyc_status === "rejected"
              ? (vendor.kyc_rejection_reason || "Please contact support to resubmit.")
              : "You can add products and services now — they'll go live once admin approves your KYC (usually within 24h)."}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={Package} label="Products" value={String(s.products)} />
        <Stat icon={Wrench} label="Services" value={String(s.services)} />
        <Stat icon={ReceiptText} label="Orders" value={String(s.orderCount)} />
        <Stat icon={TrendingUp} label="Revenue" value={inr(s.revenue)} accent />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          to="/vendor/products" icon={Package}
          title="Manage products" desc="Add, edit and publish your products to millions of shoppers."
        />
        <ActionCard
          to="/vendor/services" icon={Wrench}
          title="Manage services" desc="List services like cleaning, plumbing, tutoring with duration & coverage area."
        />
        <ActionCard
          to="/vendor/orders" icon={ReceiptText}
          title="View orders" desc="Track customer orders and update fulfilment status."
        />
        <ActionCard
          to="/vendor/payouts" icon={Wallet}
          title="Payouts" desc="See weekly settlements and download invoices."
        />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${accent ? "border-primary/40 bg-primary-soft/30" : "border-border/60"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
      <div className="flex-1">
        <h3 className="font-display font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

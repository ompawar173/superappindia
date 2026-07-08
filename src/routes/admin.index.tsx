import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, ReceiptText, Store, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [vendors, riders, orders] = await Promise.all([
        supabase.from("vendors").select("id, kyc_status, is_active"),
        supabase.from("delivery_partners").select("user_id, kyc_status, is_online"),
        supabase.from("orders").select("total, status"),
      ]);
      const vens = (vendors.data ?? []) as { kyc_status: string; is_active: boolean }[];
      const rids = (riders.data ?? []) as { kyc_status: string; is_online: boolean }[];
      const ords = (orders.data ?? []) as { total: number; status: string }[];
      const gmv = ords
        .filter((o) => ["delivered", "completed"].includes(o.status))
        .reduce((s, o) => s + Number(o.total ?? 0), 0);
      return {
        vendors: vens.length,
        activeVendors: vens.filter((v) => v.kyc_status === "approved" && v.is_active).length,
        pendingKyc: vens.filter((v) => v.kyc_status === "pending").length,
        riders: rids.length,
        onlineRiders: rids.filter((r) => r.is_online).length,
        pendingRiders: rids.filter((r) => r.kyc_status === "pending").length,
        orders: ords.length,
        gmv,
      };
    },
  });

  const s = data ?? { vendors: 0, activeVendors: 0, pendingKyc: 0, riders: 0, onlineRiders: 0, pendingRiders: 0, orders: 0, gmv: 0 };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Operations dashboard</h1>
        <p className="text-sm text-muted-foreground">Local shops, riders & live orders across SuperApp India.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total vendors" value={s.vendors} icon={Store} hint={`${s.activeVendors} live`} />
        <Stat label="Pending KYC" value={s.pendingKyc} icon={Store} alert={s.pendingKyc > 0} />
        <Stat label="Riders" value={s.riders} icon={Bike} hint={`${s.onlineRiders} online`} />
        <Stat label="Rider applications" value={s.pendingRiders} icon={Bike} alert={s.pendingRiders > 0} />
        <Stat label="Orders (all-time)" value={s.orders} icon={ReceiptText} />
        <Stat label="GMV (delivered)" value={inr(s.gmv)} icon={TrendingUp} accent />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Shops & services">
          <p className="text-sm text-muted-foreground">
            Approve local <strong>vendor KYC</strong>, curate <strong>services</strong> with cover images, and manage the home <strong>banners</strong> that appear on the app.
          </p>
        </Panel>
        <Panel title="Delivery ops">
          <p className="text-sm text-muted-foreground">
            Review <strong>rider applications</strong>, monitor online riders, and manage <strong>user roles</strong> across the platform.
          </p>
        </Panel>
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, hint, accent, alert }: any) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${accent ? "border-primary/40 bg-primary-soft/30" : "border-border/60"} ${alert ? "border-warning/60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="font-display font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}

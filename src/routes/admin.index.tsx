import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Link2, MousePointerClick, Receipt, Store, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [partners, links, clicks, conversions, vendors] = await Promise.all([
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("affiliate_links").select("id", { count: "exact", head: true }),
        supabase.from("link_clicks").select("id", { count: "exact", head: true }),
        supabase.from("conversions").select("commission_amount, gross_amount, status"),
        supabase.from("vendors").select("id, kyc_status"),
      ]);
      const conv = conversions.data ?? [];
      const vens = (vendors.data ?? []) as { kyc_status: string }[];
      return {
        partners: partners.count ?? 0,
        links: links.count ?? 0,
        clicks: clicks.count ?? 0,
        conversions: conv.length,
        gmv: conv.reduce((s, r: any) => s + Number(r.gross_amount ?? 0), 0),
        commission: conv.reduce((s, r: any) => s + Number(r.commission_amount ?? 0), 0),
        vendors: vens.length,
        pendingKyc: vens.filter((v) => v.kyc_status === "pending").length,
      };
    },
  });

  const s = data ?? { partners:0,links:0,clicks:0,conversions:0,gmv:0,commission:0,vendors:0,pendingKyc:0 };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Aggregator dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time view of clicks, conversions and commission.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Partners" value={s.partners} icon={Building2} hint="Active partner brands" />
        <Stat label="UTM links" value={s.links} icon={Link2} hint="Tracked redirect links" />
        <Stat label="Clicks (all-time)" value={s.clicks} icon={MousePointerClick} />
        <Stat label="Conversions" value={s.conversions} icon={Receipt} />
        <Stat label="GMV" value={inr(s.gmv)} icon={TrendingUp} accent />
        <Stat label="Commission earned" value={inr(s.commission)} icon={TrendingUp} accent />
        <Stat label="Vendors" value={s.vendors} icon={Store} />
        <Stat label="Pending KYC" value={s.pendingKyc} icon={Store} alert={s.pendingKyc > 0} />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Aggregator panel">
          <p className="text-sm text-muted-foreground">
            Manage <strong>partners</strong>, generate <strong>UTM links</strong>, track <strong>clicks</strong> and ingest postbacks from affiliate networks (Cuelinks, Impact, EarnKaro).
          </p>
        </Panel>
        <Panel title="Ops & ONDC panel">
          <p className="text-sm text-muted-foreground">
            Approve <strong>vendors</strong>, manage <strong>roles</strong>, configure <strong>ONDC participant</strong> credentials and inspect Beckn transaction logs.
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

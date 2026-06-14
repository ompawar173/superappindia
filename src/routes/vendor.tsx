import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Package, ReceiptText, Store, Wallet, Wrench, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/vendor")({ component: VendorLayout });

const NAV = [
  { to: "/vendor", label: "Overview", icon: BarChart3, exact: true },
  { to: "/vendor/products", label: "Products", icon: Package },
  { to: "/vendor/services", label: "Services", icon: Wrench },
  { to: "/vendor/orders", label: "Orders", icon: ReceiptText },
  { to: "/vendor/payouts", label: "Payouts", icon: Wallet },
];

function VendorLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/seller/auth" });
  }, [user, loading, navigate]);

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/vendor" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="SuperApp India" className="h-7 w-auto" />
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Seller</span>
          </Link>
          <div className="flex items-center gap-3">
            {vendor && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                vendor.kyc_status === "approved" ? "bg-success/15 text-success" :
                vendor.kyc_status === "rejected" ? "bg-destructive/15 text-destructive" :
                "bg-warning/15 text-warning-foreground"
              )}>
                <ShieldCheck className="h-3 w-3" /> KYC {vendor.kyc_status}
              </span>
            )}
            <Link to="/" className="text-xs text-muted-foreground hover:underline">← Back to app</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-background p-3 md:block">
          <nav className="space-y-1">
            {NAV.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
      <MobileBottomNav path={path} />
    </div>
  );
}

function MobileBottomNav({ path }: { path: string }) {
  const items = [
    { to: "/vendor", icon: BarChart3, label: "Home", exact: true },
    { to: "/vendor/products", icon: Package, label: "Products" },
    { to: "/vendor/services", icon: Wrench, label: "Services" },
    { to: "/vendor/orders", icon: ReceiptText, label: "Orders" },
    { to: "/vendor/payouts", icon: Wallet, label: "Payouts" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link to={it.to} className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                <Icon className={cn("h-4 w-4", active && "scale-110")} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

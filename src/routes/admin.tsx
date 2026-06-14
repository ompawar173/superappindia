import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  BarChart3, Bike, Building2, Globe2, Image, Link2, Sparkles, Store, Users2, Wrench,
} from "lucide-react";
import { useRoles } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const NAV = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/banners", label: "Banners", icon: Image },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/partners", label: "Partners", icon: Building2 },
  { to: "/admin/links", label: "UTM Links", icon: Link2 },
  { to: "/admin/vendors", label: "Vendors", icon: Store },
  { to: "/admin/delivery", label: "Riders", icon: Bike },
  { to: "/admin/users", label: "Users & Roles", icon: Users2 },
  { to: "/admin/ondc", label: "ONDC", icon: Globe2 },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useRoles();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/account" });
  }, [isAdmin, user, loading, navigate]);

  const path = useRouterState({ select: (s) => s.location.pathname });

  if (loading || !isAdmin) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading admin…</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="SuperApp India" className="h-7 w-auto" />
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Admin</span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:underline">← Back to app</Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-background p-3 md:block">
          <nav className="space-y-1">
            {NAV.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
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
          <div className="mt-6 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <Sparkles className="mb-1 h-4 w-4 text-primary" />
            SuperApp India operations center.
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

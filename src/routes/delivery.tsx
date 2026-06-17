import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home as HomeIcon, ListChecks, Wallet, User, Bike } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/delivery")({ component: DeliveryLayout });

function DeliveryLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Public routes inside /delivery: the landing page and the auth screen.
  const isPublic = path === "/delivery" || path === "/delivery/auth";

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) navigate({ to: "/delivery/auth" });
  }, [user, loading, isPublic, navigate]);

  // Public pages render with no chrome (the landing has its own header).
  if (isPublic) return <Outlet />;

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/delivery/dashboard" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="SuperApp India" className="h-7 w-auto" />
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Rider</span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:underline">App ↗</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4"><Outlet /></main>
      <RiderBottomNav path={path} />
    </div>
  );
}

function RiderBottomNav({ path }: { path: string }) {
  const items = [
    { to: "/delivery/dashboard", icon: HomeIcon, label: "Home" },
    { to: "/delivery/available", icon: Bike, label: "Pickups" },
    { to: "/delivery/assignments", icon: ListChecks, label: "Trips" },
    { to: "/delivery/earnings", icon: Wallet, label: "Earnings" },
    { to: "/delivery/profile", icon: User, label: "Profile" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {items.map((it) => {
          const active = path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link to={it.to} className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

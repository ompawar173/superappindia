import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, User, LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.png.asset.json";
import { CartButton } from "@/components/cart-drawer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pb-24 md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="SuperApp India" className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <TopLink to="/" label="Home" />
          <TopLink to="/shops" label="Shops" />
          <TopLink to="/categories" label="Explore" />
          <TopLink to="/rewards" label="Rewards" />
          <TopLink to="/register" label="Register business" />
          <TopLink to="/delivery" label="Ride with us" />
        </nav>
        <div className="flex items-center gap-2">
          <CartButton />
          <Link
            to="/account"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary-glow"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}


function TopLink({ to, label }: { to: string; label: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? path === "/" : path.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition",
        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", icon: Home, label: "Home", exact: true },
    { to: "/categories", icon: LayoutGrid, label: "Explore" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/account", icon: User, label: "Me" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-6xl grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
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

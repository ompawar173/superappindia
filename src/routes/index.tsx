import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Search, Sparkles, TrendingUp } from "lucide-react";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SuperApp — India's all-in-one app" },
      { name: "description", content: "Food, grocery, travel, hotels, cabs, recharges and more. One app for everything, with cashback on every order." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell>
      <Hero />
      <CategoriesGrid />
      <FeaturedPartners />
      <PromoStrip />
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="relative overflow-hidden rounded-3xl gradient-brand p-6 text-primary-foreground shadow-elevated md:p-10">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> India's first true super app
          </div>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight md:text-5xl">
            One app for food, travel, hotels & everything in between.
          </h1>
          <p className="mt-3 max-w-xl text-sm/relaxed text-primary-foreground/90 md:text-base">
            Order from Swiggy, Zomato, Blinkit. Book on MakeMyTrip, OYO, Agoda. Recharge, ride, shop —
            all in one place, with SuperCoins cashback on every order.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-foreground shadow-soft">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Mumbai, MH</span>
              <span className="text-xs text-muted-foreground">· change</span>
              <div className="mx-2 h-5 w-px bg-border" />
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder='Search "pizza", "MMT flights", "OYO Goa"'
              />
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-foreground/85"
            >
              Explore <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesGrid() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, icon, color, sort_order")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-lg font-bold">What's on your mind?</h2>
        <Link to="/categories" className="text-sm font-medium text-primary hover:underline">View all</Link>
      </div>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {(categories ?? []).map((c) => {
          const Icon = (Icons as Record<string, any>)[c.icon ?? "Sparkles"] ?? Icons.Sparkles;
          return (
            <Link
              key={c.id}
              to="/c/$category"
              params={{ category: c.slug }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-2xl transition group-hover:scale-105"
                style={{ backgroundColor: (c.color ?? "#dcfce7") + "22", color: c.color ?? undefined }}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-center text-xs font-medium leading-tight">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedPartners() {
  const { data: partners } = useQuery({
    queryKey: ["featured-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, slug, name, description, commission_pct, type, categories(slug,name,color,icon)")
        .eq("active", true)
        .eq("featured", true)
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Featured partners</h2>
          <p className="text-xs text-muted-foreground">Top brands, exclusive cashback for SuperApp users</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
          <TrendingUp className="h-3 w-3" /> Trending
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(partners ?? []).map((p) => {
          const cat: any = p.categories;
          const Icon = (Icons as Record<string, any>)[cat?.icon ?? "Sparkles"] ?? Icons.Sparkles;
          return (
            <Link
              key={p.id}
              to="/p/$partner"
              params={{ partner: p.slug }}
              className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: (cat?.color ?? "#16a34a") + "1f", color: cat?.color ?? undefined }}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  {p.type === "own" && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">OWN</span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                {p.commission_pct > 0 && (
                  <span className="mt-2 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Up to {p.commission_pct}% back
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PromoStrip() {
  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("id,title,subtitle,cta_label,cta_url,bg_color,sort_order")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-3 sm:grid-cols-2">
        {(banners ?? []).map((b) => (
          <a
            key={b.id}
            href={b.cta_url ?? "#"}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border/60 p-5 transition hover:-translate-y-0.5 hover:shadow-soft",
            )}
            style={{ backgroundColor: b.bg_color ?? undefined }}
          >
            <h3 className="font-display text-lg font-bold text-foreground">{b.title}</h3>
            <p className="mt-1 text-sm text-foreground/70">{b.subtitle}</p>
            {b.cta_label && (
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {b.cta_label} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

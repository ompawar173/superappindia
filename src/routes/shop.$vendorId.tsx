import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Share2, Star, Store } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/$vendorId")({
  component: ShopPage,
  errorComponent: ({ error }) => (
    <AppShell><div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-destructive">{error.message}</div></AppShell>
  ),
  notFoundComponent: () => (
    <AppShell><div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">Shop not found.</div></AppShell>
  ),
});

function ShopPage() {
  const { vendorId } = Route.useParams();
  const [tab, setTab] = useState<"products" | "services" | "about">("products");

  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id,business_name,city,address,tagline,category,logo_url,cover_url,rating")
        .eq("id", vendorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["shop-items", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_products")
        .select("id,title,description,price,mrp,images,kind,duration_minutes,service_area,stock")
        .eq("vendor_id", vendorId)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shop,
  });

  const products = (items ?? []).filter((i) => i.kind !== "service");
  const services = (items ?? []).filter((i) => i.kind === "service");

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: shop?.business_name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  if (isLoading || !shop) {
    return <AppShell><div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 pt-4">
        <div className="relative aspect-[16/6] overflow-hidden rounded-3xl bg-muted shadow-soft">
          {shop.cover_url ? (
            <img src={shop.cover_url} alt={shop.business_name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
              <Store className="h-16 w-16 text-primary/50" />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-4">
          <div className="-mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-elevated">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-primary-soft text-primary"><Store className="h-8 w-8" /></div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-bold leading-tight">{shop.business_name}</h1>
                {shop.tagline && <p className="text-sm text-muted-foreground">{shop.tagline}</p>}
              </div>
              <button onClick={share} className="rounded-full border border-border bg-card p-2 hover:border-primary/40" aria-label="Share">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {shop.category && <span className="capitalize">{shop.category}</span>}
              {shop.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.city}</span>}
              {Number(shop.rating) > 0 && (
                <span className="inline-flex items-center gap-0.5 text-primary"><Star className="h-3 w-3 fill-current" /> {Number(shop.rating).toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-border">
          {(["products", "services", "about"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t} {t === "products" && `(${products.length})`}{t === "services" && `(${services.length})`}
            </button>
          ))}
        </div>

        <div className="py-6">
          {tab === "products" && <ItemGrid items={products} kind="product" />}
          {tab === "services" && <ItemGrid items={services} kind="service" />}
          {tab === "about" && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-5 text-sm">
              <p><strong>About:</strong> {shop.tagline ?? shop.business_name}</p>
              {shop.address && <p><strong>Address:</strong> {shop.address}</p>}
              {shop.city && <p><strong>City:</strong> {shop.city}</p>}
              {shop.category && <p><strong>Category:</strong> <span className="capitalize">{shop.category}</span></p>}
            </div>
          )}
        </div>

        <Link to="/shops" className="text-sm text-primary hover:underline">← All shops</Link>
      </section>
    </AppShell>
  );
}

function ItemGrid({ items, kind }: { items: any[]; kind: "product" | "service" }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No {kind}s listed yet.</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((it) => {
        const img = Array.isArray(it.images) && it.images.length > 0 ? it.images[0] : null;
        return (
          <div id={`product-${it.id}`} key={it.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="aspect-square bg-muted">
              {img ? <img src={img} alt={it.title} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground/40"><Store className="h-8 w-8" /></div>}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-1 text-sm font-semibold">{it.title}</p>
              {it.description && <p className="line-clamp-1 text-[11px] text-muted-foreground">{it.description}</p>}
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-base font-bold">₹{Number(it.price)}</span>
                {it.mrp && Number(it.mrp) > Number(it.price) && (
                  <span className="text-xs text-muted-foreground line-through">₹{Number(it.mrp)}</span>
                )}
              </div>
              {kind === "service" && it.duration_minutes && (
                <p className="text-[10px] text-muted-foreground">{it.duration_minutes} min</p>
              )}
              <button className="mt-2 w-full rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow">
                {kind === "service" ? "Book" : "Add"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

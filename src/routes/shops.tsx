import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Store, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shops")({
  head: () => ({
    meta: [
      { title: "Shops on SuperApp India — Local stores, hotels & services" },
      { name: "description", content: "Browse every shop, hotel, restaurant and service provider on SuperApp India. Order from local vendors near you." },
      { property: "og:title", content: "Shops on SuperApp India" },
      { property: "og:description", content: "Discover local shops, hotels, and service providers near you." },
    ],
  }),
  component: ShopsPage,
});

function ShopsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data: shops } = useQuery({
    queryKey: ["shops-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id,business_name,city,tagline,category,logo_url,cover_url,rating")
        .eq("kyc_status", "approved")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cats = Array.from(new Set((shops ?? []).map((s) => s.category).filter(Boolean))) as string[];

  const filtered = (shops ?? []).filter((s) => {
    if (cat !== "all" && s.category !== cat) return false;
    if (q && !`${s.business_name} ${s.tagline ?? ""} ${s.city ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Shops on SuperApp India</h1>
        <p className="mt-1 text-sm text-muted-foreground">{filtered.length} shops near you</p>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shops, hotels, restaurants…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {cats.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {["all", ...cats].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                  cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <ShopCard key={s.id} shop={s} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No shops match your search yet.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

export function ShopCard({ shop }: { shop: any }) {
  return (
    <Link
      to="/shop/$vendorId"
      params={{ vendorId: shop.id }}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {shop.cover_url ? (
          <img src={shop.cover_url} alt={shop.business_name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
            <Store className="h-10 w-10 text-primary/60" />
          </div>
        )}
        {shop.logo_url && (
          <img src={shop.logo_url} alt="" className="absolute bottom-2 left-3 h-12 w-12 rounded-xl border-2 border-card object-cover shadow-elevated" />
        )}
      </div>
      <div className="p-3 pl-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold leading-tight">{shop.business_name}</h3>
          {Number(shop.rating) > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">
              <Star className="h-3 w-3 fill-current" /> {Number(shop.rating).toFixed(1)}
            </span>
          )}
        </div>
        {shop.tagline && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{shop.tagline}</p>}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {shop.category && <span className="capitalize">{shop.category}</span>}
          {shop.category && shop.city && <span>·</span>}
          {shop.city && <span>{shop.city}</span>}
        </div>
      </div>
    </Link>
  );
}

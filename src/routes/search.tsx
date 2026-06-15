import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search as SearchIcon, Store } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { ShopCard } from "./shops";

const schema = z.object({ q: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: () => ({ meta: [{ title: "Search — SuperApp India" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const term = q.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      const like = `%${term}%`;
      const [shopsRes, prodsRes, svcRes] = await Promise.all([
        supabase
          .from("vendors")
          .select("id,business_name,city,tagline,category,logo_url,cover_url,rating")
          .eq("kyc_status", "approved")
          .eq("is_active", true)
          .or(`business_name.ilike.${like},tagline.ilike.${like},category.ilike.${like},city.ilike.${like}`)
          .limit(12),
        supabase
          .from("vendor_products")
          .select("id,title,description,price,mrp,images,kind,vendor_id,vendors!inner(id,business_name,kyc_status,is_active)")
          .eq("active", true)
          .eq("vendors.kyc_status", "approved")
          .eq("vendors.is_active", true)
          .or(`title.ilike.${like},description.ilike.${like}`)
          .limit(20),
        supabase
          .from("services")
          .select("id,slug,name,short_desc,icon,base_price")
          .eq("active", true)
          .or(`name.ilike.${like},short_desc.ilike.${like}`)
          .limit(10),
      ]);
      return {
        shops: shopsRes.data ?? [],
        products: prodsRes.data ?? [],
        services: svcRes.data ?? [],
      };
    },
  });

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Search</h1>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-soft">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            defaultValue={q}
            onChange={(e) => navigate({ search: { q: e.target.value }, replace: true })}
            placeholder="Search shops, products, services…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {!term && <p className="mt-6 text-sm text-muted-foreground">Type to search across every shop, product, and service.</p>}

        {term && isFetching && <p className="mt-6 text-sm text-muted-foreground">Searching…</p>}

        {term && data && (
          <div className="mt-6 space-y-8">
            <Group title={`Shops (${data.shops.length})`}>
              {data.shops.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.shops.map((s: any) => <ShopCard key={s.id} shop={s} />)}
                </div>
              )}
            </Group>

            <Group title={`Products (${data.products.length})`}>
              {data.products.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {data.products.map((p: any) => {
                    const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
                    return (
                      <Link
                        key={p.id}
                        to="/shop/$vendorId"
                        params={{ vendorId: p.vendor_id }}
                        hash={`product-${p.id}`}
                        className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40"
                      >
                        <div className="aspect-square bg-muted">
                          {img ? <img src={img} alt={p.title} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground/40"><Store className="h-8 w-8" /></div>}
                        </div>
                        <div className="p-2.5">
                          <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
                          <p className="line-clamp-1 text-[10px] text-muted-foreground">{p.vendors?.business_name}</p>
                          <p className="mt-1 font-display text-sm font-bold">₹{Number(p.price)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Group>

            <Group title={`Services (${data.services.length})`}>
              {data.services.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {data.services.map((s: any) => (
                    <Link key={s.id} to="/services/$slug" params={{ slug: s.slug }} className="rounded-2xl border border-border bg-card p-3 hover:border-primary/40">
                      <p className="text-sm font-semibold">{s.name}</p>
                      {s.short_desc && <p className="text-xs text-muted-foreground">{s.short_desc}</p>}
                      {s.base_price && <p className="mt-1 text-xs text-primary">from ₹{Number(s.base_price)}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </Group>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No matches.</p>;
}

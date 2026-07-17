import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Store } from "lucide-react";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/c/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["category", category],
    queryFn: async () => {
      const { data: cat, error: e1 } = await supabase
        .from("categories")
        .select("id,name,slug,icon,color")
        .eq("slug", category)
        .maybeSingle();
      if (e1) throw e1;
      if (!cat) throw notFound();

      // Local vendors whose free-text `category` matches this category name (case-insensitive).
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id,business_name,tagline,city,logo_url,cover_url,rating")
        .eq("is_active", true)
        .eq("kyc_status", "approved")
        .ilike("category", cat.name);

      // Products tagged to this category id.
      const { data: products } = await supabase
        .from("vendor_products")
        .select("id,title,price,image_url,vendor_id")
        .eq("is_active", true)
        .eq("category_id", cat.id)
        .limit(24);

      return { cat, vendors: vendors ?? [], products: products ?? [] };
    },
  });

  if (isLoading) return <AppShell><div className="p-10 text-center text-muted-foreground">Loading…</div></AppShell>;
  if (!data) return null;
  const Icon = (Icons as Record<string, any>)[data.cat.icon ?? "Sparkles"] ?? Icons.Sparkles;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{ backgroundColor: (data.cat.color ?? "#16a34a") + "22", color: data.cat.color ?? undefined }}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">{data.cat.name}</h1>
            <p className="text-sm text-muted-foreground">{data.vendors.length} local shop(s) · {data.products.length} product(s)</p>
          </div>
        </div>

        <h2 className="mt-8 font-display text-lg font-bold">Local shops</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.vendors.map((v) => (
            <Link
              key={v.id}
              to="/shop/$vendorId"
              params={{ vendorId: v.id }}
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{v.business_name}</h3>
                <p className="truncate text-xs text-muted-foreground">{v.tagline || v.city || "Local shop"}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
          {data.vendors.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No local shops listed in this category yet. <Link to="/seller/auth" className="text-primary underline">Register your shop</Link>.
            </div>
          )}
        </div>

        {data.products.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-lg font-bold">Products in {data.cat.name}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.products.map((p) => (
                <Link
                  key={p.id}
                  to="/shop/$vendorId"
                  params={{ vendorId: p.vendor_id }}
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="aspect-square bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs font-semibold text-primary">₹{Number(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

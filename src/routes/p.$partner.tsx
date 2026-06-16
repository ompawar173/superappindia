import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Tag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { pct } from "@/lib/format";

export const Route = createFileRoute("/p/$partner")({
  component: PartnerPage,
});

function PartnerPage() {
  const { partner } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["partner", partner],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("partners")
        .select("id,slug,name,description,type,base_url,categories(slug,name,color)")
        .eq("slug", partner)
        .maybeSingle();
      if (error) throw error;
      if (!p) throw notFound();
      const [{ data: offers }, { data: links }] = await Promise.all([
        supabase.from("partner_offers").select("id,title,code,description,valid_to").eq("partner_id", p.id).eq("active", true),
        supabase.from("affiliate_links").select("id,short_code,campaign").eq("partner_id", p.id).eq("active", true).limit(1),
      ]);
      return { partner: p, offers: offers ?? [], primaryLink: links?.[0] };
    },
  });

  if (isLoading) return <AppShell><div className="p-10 text-center text-muted-foreground">Loading…</div></AppShell>;
  if (!data) return null;
  const cat: any = data.partner.categories;
  const ctaUrl = data.primaryLink ? `/r/${data.primaryLink.short_code}` : data.partner.base_url ?? "#";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/c/$category" params={{ category: cat?.slug ?? "food" }} className="text-xs text-muted-foreground hover:underline">
          ← {cat?.name}
        </Link>

        <div className="mt-3 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
          <div className="gradient-brand p-6 text-primary-foreground">
            <h1 className="font-display text-3xl font-bold">{data.partner.name}</h1>
            <p className="mt-2 max-w-2xl text-sm/relaxed text-primary-foreground/90">{data.partner.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data.partner.commission_pct > 0 && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {pct(Number(data.partner.commission_pct))} SuperCoins back
                </span>
              )}
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur capitalize">
                {data.partner.type}
              </span>
            </div>
          </div>

          <div className="p-6">
            <a
              href={ctaUrl}
              target={data.partner.type === "own" ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary-glow"
            >
              {data.partner.type === "own" ? "Open service" : `Order on ${data.partner.name}`}
              {data.partner.type === "own" ? <ArrowRight className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              You'll continue on {data.partner.name}. We track your order to credit SuperCoins.
            </p>

            {data.offers.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display font-semibold">Active offers</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.offers.map((o) => (
                    <li key={o.id} className="rounded-2xl border border-border/60 bg-muted/40 p-3">
                      <div className="flex items-start gap-2">
                        <Tag className="mt-0.5 h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold">{o.title}</h3>
                          {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                          {o.code && (
                            <span className="mt-1 inline-block rounded-md border border-dashed border-primary/40 bg-primary-soft px-2 py-0.5 font-mono text-xs text-primary">
                              {o.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

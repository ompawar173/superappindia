import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { pct } from "@/lib/format";

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
      const { data: partners, error: e2 } = await supabase
        .from("partners")
        .select("id,slug,name,description,type,logo_url")
        .eq("active", true)
        .eq("category_id", cat.id)
        .order("featured", { ascending: false });
      if (e2) throw e2;
      return { cat, partners: partners ?? [] };
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
            <p className="text-sm text-muted-foreground">{data.partners.length} partner(s) available</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.partners.map((p) => (
            <Link
              key={p.id}
              to="/p/$partner"
              params={{ partner: p.slug }}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  {p.type === "own" && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">OWN</span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
          {data.partners.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              No partners listed in this category yet. Check back soon!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

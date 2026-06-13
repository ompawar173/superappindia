import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Explore categories — SuperApp" },
      { name: "description", content: "Browse all SuperApp categories: food, grocery, travel, hotels, cabs, pharmacy, recharges and own services." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name,icon,color")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Explore</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a category to see all partners.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(categories ?? []).map((c) => {
            const Icon = (Icons as Record<string, any>)[c.icon ?? "Sparkles"] ?? Icons.Sparkles;
            return (
              <Link
                key={c.id}
                to="/c/$category"
                params={{ category: c.slug }}
                className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl"
                  style={{ backgroundColor: (c.color ?? "#16a34a") + "22", color: c.color ?? undefined }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">View partners</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

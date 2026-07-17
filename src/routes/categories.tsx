import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Explore categories — SuperApp India" },
      { name: "description", content: "Browse local shops, hotels and home services near you on SuperApp India — food, grocery, pharmacy, home services and more." },
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
        .select("id,slug,name,icon,image_url,color")
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
        <p className="mt-1 text-sm text-muted-foreground">Pick a category to see local shops & services near you.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(categories ?? []).map((c) => {
            const Icon = (Icons as Record<string, any>)[c.icon ?? "Sparkles"] ?? Icons.Sparkles;
            return (
              <Link
                key={c.id}
                to="/c/$category"
                params={{ category: c.slug }}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center" style={{ backgroundColor: (c.color ?? "#16a34a") + "22", color: c.color ?? undefined }}>
                    <Icon className="h-10 w-10" />
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="font-display text-base font-bold text-white drop-shadow">{c.name}</h3>
                  <p className="text-[11px] text-white/80">View local shops →</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

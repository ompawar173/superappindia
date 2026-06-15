import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Search, TrendingUp } from "lucide-react";
import * as Icons from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SuperApp India — One app for food, grocery, travel & more" },
      { name: "description", content: "India's all-in-one super app. Order food, groceries, travel, hotels, cabs, recharges and book home services — with live delivery tracking and cashback on every order." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell>
      <BannerCarousel />
      <CategoriesGrid />
      <ShopsRail />
      <FreshFromShops />
      <ServicesRail />
      <FeaturedPartners />
    </AppShell>
  );
}

function ShopsRail() {
  const { data: shops } = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id,business_name,city,tagline,category,logo_url,cover_url,rating")
        .eq("kyc_status", "approved")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });
  const list = shops ?? [];
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Shops on SuperApp India</h2>
          <p className="text-xs text-muted-foreground">Local stores, hotels & service providers near you</p>
        </div>
        <Link to="/shops" className="text-sm font-medium text-primary hover:underline">View all</Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3 min-w-max">
          {list.map((s: any) => (
            <Link
              key={s.id}
              to="/shop/$vendorId"
              params={{ vendorId: s.id }}
              className="group w-56 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="relative aspect-[16/10] bg-muted">
                {s.cover_url ? (
                  <img src={s.cover_url} alt={s.business_name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
                    <Icons.Store className="h-8 w-8 text-primary/60" />
                  </div>
                )}
                {s.logo_url && <img src={s.logo_url} alt="" className="absolute bottom-1.5 left-2 h-9 w-9 rounded-lg border-2 border-card object-cover" />}
              </div>
              <div className="p-2.5 pl-3">
                <p className="line-clamp-1 text-sm font-semibold">{s.business_name}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground capitalize">{s.category ?? "Shop"} {s.city ? `· ${s.city}` : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FreshFromShops() {
  const { data: products } = useQuery({
    queryKey: ["home-fresh-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_products")
        .select("id,title,price,mrp,images,vendor_id,vendors!inner(business_name,kyc_status,is_active)")
        .eq("active", true)
        .eq("vendors.kyc_status", "approved")
        .eq("vendors.is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });
  const list = products ?? [];
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-lg font-bold">Fresh from local shops</h2>
        <Link to="/shops" className="text-sm font-medium text-primary hover:underline">Browse shops</Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3 min-w-max">
          {list.map((p: any) => {
            const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
            return (
              <Link
                key={p.id}
                to="/shop/$vendorId"
                params={{ vendorId: p.vendor_id }}
                hash={`product-${p.id}`}
                className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:border-primary/40"
              >
                <div className="aspect-square bg-muted">
                  {img ? <img src={img} alt={p.title} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground/40"><Icons.Store className="h-7 w-7" /></div>}
                </div>
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-semibold">{p.title}</p>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">{p.vendors?.business_name}</p>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-sm font-bold">₹{Number(p.price)}</span>
                    {p.mrp && Number(p.mrp) > Number(p.price) && <span className="text-[10px] text-muted-foreground line-through">₹{Number(p.mrp)}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BannerCarousel() {
  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("id,title,subtitle,image_url,cta_label,cta_url,bg_color,sort_order")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4500, stopOnInteraction: false })]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect); onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla]);

  const slides = banners ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="overflow-hidden rounded-3xl shadow-elevated" ref={emblaRef}>
        <div className="flex">
          {slides.map((b: any) => (
            <a
              key={b.id}
              href={b.cta_url ?? "#"}
              className="relative flex min-w-0 flex-[0_0_100%] aspect-[16/8] md:aspect-[16/6]"
              style={{ backgroundColor: b.bg_color ?? "#0a1f17" }}
            >
              {b.image_url && (
                <img src={b.image_url} alt={b.title} className="absolute inset-0 h-full w-full object-cover opacity-90" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
              <div className="relative z-10 flex flex-col justify-end gap-2 p-5 text-white md:p-10">
                <h2 className="font-display text-2xl font-bold leading-tight md:text-4xl max-w-xl">{b.title}</h2>
                {b.subtitle && <p className="max-w-md text-sm text-white/90 md:text-base">{b.subtitle}</p>}
                {b.cta_label && (
                  <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-foreground">
                    {b.cta_label} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => embla?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === selected ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2.5 shadow-soft">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Mumbai, MH</span>
        <span className="text-xs text-muted-foreground">· change</span>
        <div className="mx-2 h-5 w-px bg-border" />
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder='Search "biryani", "groceries", "OYO Goa"'
        />
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
        .select("id, slug, name, icon, image_url, color, sort_order")
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
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-8">
        {(categories ?? []).map((c) => {
          const Icon = (Icons as Record<string, any>)[c.icon ?? "Sparkles"] ?? Icons.Sparkles;
          return (
            <Link
              key={c.id}
              to="/c/$category"
              params={{ category: c.slug }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card aspect-square transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              ) : (
                <span
                  className="absolute inset-0 grid place-items-center"
                  style={{ backgroundColor: (c.color ?? "#dcfce7") + "22", color: c.color ?? undefined }}
                >
                  <Icon className="h-8 w-8" />
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                <p className="text-center text-[11px] font-semibold text-white leading-tight">{c.name}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ServicesRail() {
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, slug, name, icon, short_desc, base_price")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">SuperApp India Services</h2>
          <p className="text-xs text-muted-foreground">Book home services in minutes</p>
        </div>
        <Link to="/categories" className="text-sm font-medium text-primary hover:underline">All services</Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-2 min-w-max">
          {(services ?? []).map((s) => {
            const Icon = (Icons as Record<string, any>)[s.icon ?? "Sparkles"] ?? Icons.Sparkles;
            return (
              <Link
                key={s.id}
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="group flex items-center gap-2.5 rounded-full border border-border/60 bg-card px-4 py-2.5 transition hover:border-primary/40 hover:bg-primary-soft/40"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-tight">{s.name}</p>
                  {s.base_price && (
                    <p className="text-[10px] text-muted-foreground">from ₹{Number(s.base_price)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
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
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Featured partners</h2>
          <p className="text-xs text-muted-foreground">Top brands, exclusive cashback for SuperApp India users</p>
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

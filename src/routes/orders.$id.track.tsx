import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bike, CheckCircle2, MapPin, Package, PackageCheck, Phone, ReceiptText, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";
import { LiveMap } from "@/components/live-map";

export const Route = createFileRoute("/orders/$id/track")({
  component: TrackOrder,
  notFoundComponent: () => (
    <AppShell><div className="p-10 text-center text-muted-foreground">Order not found.</div></AppShell>
  ),
  errorComponent: () => (
    <AppShell><div className="p-10 text-center text-destructive">Couldn't load tracking.</div></AppShell>
  ),
});

function TrackOrder() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["track-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, status, delivery_status, delivery_partner_id, shipping_address, created_at")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: rider } = useQuery({
    queryKey: ["track-rider", order?.delivery_partner_id],
    enabled: !!order?.delivery_partner_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_partners")
        .select("full_name, phone, vehicle_type, vehicle_number, current_lat, current_lng, last_location_at, rating")
        .eq("user_id", order!.delivery_partner_id!).maybeSingle();
      return data;
    },
    refetchInterval: 15000,
  });

  // Realtime: refresh when rider moves or order updates
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`track-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["track-order", id] }))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_partners" },
        () => qc.invalidateQueries({ queryKey: ["track-rider"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (isLoading) return <AppShell><div className="p-10 text-center">Loading…</div></AppShell>;
  if (!order) return null;

  const status = order.delivery_status ?? order.status ?? "pending";
  const stages = [
    { key: "pending", label: "Placed", Icon: ReceiptText },
    { key: "assigned", label: "Assigned", Icon: Package },
    { key: "accepted", label: "Accepted", Icon: CheckCircle2 },
    { key: "picked_up", label: "Picked up", Icon: Truck },
    { key: "delivered", label: "Delivered", Icon: PackageCheck },
  ];
  const idx = Math.max(0, stages.findIndex((s) => s.key === status));
  const pct = (idx / (stages.length - 1)) * 100;
  const addr = (order.shipping_address ?? {}) as any;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Orders
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold">Track your order</h1>
        <p className="text-sm text-muted-foreground">Order #{String(order.id).slice(0, 8)} · {inr(Number(order.total))}</p>

        <div className="mt-5 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="relative">
            <div className="absolute left-3.5 right-3.5 top-4 h-1 rounded-full bg-muted" />
            <div
              className="absolute left-3.5 top-4 h-1 rounded-full bg-primary transition-all duration-500"
              style={{ width: `calc(${pct}% - ${pct === 0 ? 0 : pct === 100 ? 28 : 14}px)` }}
            />
            <div className="relative flex items-start justify-between">
              {stages.map((s, i) => {
                const done = i <= idx;
                const Icon = s.Icon;
                return (
                  <div key={s.key} className="flex w-14 flex-col items-center text-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-full border-2 transition ${done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`mt-1.5 text-[10px] font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {rider ? (
          <div className="mt-4 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-soft/40 to-background p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Bike className="h-6 w-6" /></span>
              <div className="flex-1">
                <p className="font-semibold">{rider.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {rider.vehicle_type} · {rider.vehicle_number} · ★ {Number(rider.rating ?? 5).toFixed(1)}
                </p>
              </div>
              <a href={`tel:${rider.phone}`} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <Phone className="h-4 w-4" />
              </a>
            </div>

            {rider.current_lat && rider.current_lng ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> Live location</span>
                  {rider.last_location_at && <span>Updated {new Date(rider.last_location_at).toLocaleTimeString()}</span>}
                </div>
                <LiveMap lat={rider.current_lat} lng={rider.current_lng} emoji="🛵" height={280} />
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Waiting for rider's first location ping…</p>
            )}
          </div>
        ) : !order.delivery_partner_id ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <Package className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Finding a rider near you…</p>
          </div>
        ) : null}

        {addr?.line1 && (
          <div className="mt-4 rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Delivering to</p>
            <p className="mt-1 text-sm font-medium">{addr.line1}{addr.city ? `, ${addr.city}` : ""}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

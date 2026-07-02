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
  const stages = ["pending", "assigned", "accepted", "picked_up", "delivered"];
  const idx = stages.indexOf(status);
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
          <div className="flex items-center justify-between">
            {stages.map((s, i) => (
              <div key={s} className="flex flex-col items-center text-center">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <span className={`mt-1 text-[10px] capitalize ${i <= idx ? "text-foreground" : "text-muted-foreground"}`}>{s.replace("_", " ")}</span>
              </div>
            ))}
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
              <div className="mt-4 rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">Rider live location</span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {rider.current_lat.toFixed(5)}, {rider.current_lng.toFixed(5)}
                </p>
                {rider.last_location_at && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Updated {new Date(rider.last_location_at).toLocaleTimeString()}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps?q=${rider.current_lat},${rider.current_lng}`}
                  target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Open in Google Maps
                </a>
                <p className="mt-2 text-[11px] text-muted-foreground text-center">
                  Embedded live map will appear here once Google Maps is connected.
                </p>
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

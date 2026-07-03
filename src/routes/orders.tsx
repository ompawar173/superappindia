import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, MapPin, Package, PackageCheck, Phone, ShoppingBag, Store } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Your orders — SuperApp India" }] }),
});

const ACTIVE = new Set(["placed", "confirmed", "assigned", "accepted", "preparing", "ready", "shipped", "picked_up", "out_for_delivery"]);
const PAST = new Set(["delivered", "completed", "cancelled", "refunded"]);

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-amber-100 text-amber-700",
  shipped: "bg-amber-100 text-amber-700",
  assigned: "bg-indigo-100 text-indigo-700",
  accepted: "bg-indigo-100 text-indigo-700",
  picked_up: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-rose-100 text-rose-700",
};

function OrdersPage() {
  const { user, loading: authLoading } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, delivery_status, total, items, shipping_address, created_at, delivery_partner_id, vendor_id, vendors(business_name), delivery_partner:delivery_partners!orders_delivery_partner_id_fkey(full_name, phone, current_lat, current_lng, last_location_at, vehicle_type, vehicle_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20000,
  });

  if (authLoading) {
    return <AppShell><div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h1 className="mt-4 font-display text-2xl font-bold">Sign in to see your orders</h1>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const active = (orders ?? []).filter((o) => ACTIVE.has(String(o.delivery_status ?? o.status)));
  const past = (orders ?? []).filter((o) => PAST.has(String(o.delivery_status ?? o.status)));

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">Your orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track deliveries and review past orders.</p>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />)}
          </div>
        ) : (orders?.length ?? 0) === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            No orders yet — explore shops to get started.
          </div>
        ) : (
          <>
            <Section title="Active" icon={Package} orders={active} showTrack />
            <Section title="Past" icon={PackageCheck} orders={past} />
          </>
        )}
      </section>
    </AppShell>
  );
}

function Section({ title, icon: Icon, orders, showTrack }: { title: string; icon: any; orders: any[]; showTrack?: boolean }) {
  if (orders.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title} <span className="text-muted-foreground">({orders.length})</span>
      </div>
      <div className="space-y-3">
        {orders.map((o) => <OrderCard key={o.id} order={o} showTrack={showTrack} />)}
      </div>
    </div>
  );
}

function OrderCard({ order, showTrack }: { order: any; showTrack?: boolean }) {
  const status = String(order.delivery_status ?? order.status ?? "placed");
  const styles = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";
  const items = Array.isArray(order.items) ? order.items : [];
  const names = items.map((i: any) => `${i.title ?? i.name ?? "Item"}${i.qty ? ` × ${i.qty}` : ""}`).join(", ");
  const addr = order.shipping_address ?? {};

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">#{String(order.id).slice(0, 8)} · {new Date(order.created_at).toLocaleString()}</p>
          {order.vendors?.business_name && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-foreground/80">
              <Store className="h-3 w-3 text-primary" /> {order.vendors.business_name}
            </p>
          )}
          <p className="mt-1 truncate text-sm font-medium">{names || "Order"}</p>
          {addr?.line1 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {addr.line1}{addr.city ? `, ${addr.city}` : ""}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${styles}`}>
            {status.replace(/_/g, " ")}
          </span>
          <p className="mt-1 font-display text-base font-bold">{inr(Number(order.total))}</p>
        </div>
      </div>

      {showTrack && order.delivery_partner && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft/40 p-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Bike className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{order.delivery_partner.full_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {order.delivery_partner.vehicle_type ?? "Rider"}{order.delivery_partner.vehicle_number ? ` · ${order.delivery_partner.vehicle_number}` : ""}
                {order.delivery_partner.current_lat && order.delivery_partner.current_lng ? " · Live" : ""}
              </p>
            </div>
          </div>
          {order.delivery_partner.phone && (
            <a href={`tel:${order.delivery_partner.phone}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-soft">
              <Phone className="h-3 w-3" /> Call
            </a>
          )}
        </div>
      )}
      {showTrack && !order.delivery_partner && ACTIVE.has(status) && (
        <p className="mt-3 text-xs text-muted-foreground italic">Waiting for a rider to accept your order…</p>
      )}

      {showTrack && (
        <div className="mt-3 flex justify-end">
          <Link
            to="/orders/$id/track"
            params={{ id: order.id }}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow"
          >
            Track order
          </Link>
        </div>
      )}
    </div>
  );
}


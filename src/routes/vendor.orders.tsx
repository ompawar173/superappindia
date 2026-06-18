import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText, BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { notificationSound } from "@/lib/notification-sound";

export const Route = createFileRoute("/vendor/orders")({ component: VendorOrders });

type OrderStatus = "placed" | "accepted" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded";

const BUCKETS: { key: string; title: string; match: (o: any) => boolean }[] = [
  { key: "new", title: "New", match: (o) => o.status === "placed" },
  { key: "prep", title: "Preparing", match: (o) => o.status === "accepted" || o.status === "preparing" },
  { key: "waiting", title: "Waiting for rider", match: (o) => o.status === "shipped" && !o.delivery_partner_id },
  { key: "out", title: "Out for delivery", match: (o) => o.status === "shipped" && !!o.delivery_partner_id },
  { key: "done", title: "Completed", match: (o) => ["delivered", "cancelled", "refunded"].includes(o.status) },
];

function VendorOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const muted = useRef(false);

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vendors").select("id,business_name").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: orders } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("vendor_id", vendor!.id)
        .order("created_at", { ascending: false })
        .limit(150);
      return data ?? [];
    },
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (!vendor?.id) return;
    const ch = supabase
      .channel(`vendor-orders-${vendor.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `vendor_id=eq.${vendor.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") toast.success("New order received");
          qc.invalidateQueries({ queryKey: ["vendor-orders", vendor.id] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendor?.id, qc]);

  const pendingCount = useMemo(
    () => (orders ?? []).filter((o: any) => o.status === "placed").length,
    [orders],
  );

  useEffect(() => {
    if (pendingCount > 0 && !muted.current) notificationSound.start();
    else notificationSound.stop();
    return () => notificationSound.stop();
  }, [pendingCount]);

  const setStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Order marked ${status}`);
    qc.invalidateQueries({ queryKey: ["vendor-orders", vendor?.id] });
  };

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = Object.fromEntries(BUCKETS.map((b) => [b.key, []]));
    (orders ?? []).forEach((o: any) => {
      const b = BUCKETS.find((x) => x.match(o));
      if (b) map[b.key].push(o);
    });
    return map;
  }, [orders]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">Live customer orders for {vendor?.business_name ?? "your shop"}.</p>
        </div>
        <button
          onClick={() => {
            muted.current = !muted.current;
            if (muted.current) notificationSound.stop();
            else if (pendingCount > 0) notificationSound.start();
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
        >
          {muted.current ? <BellOff className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5 text-primary" />}
          {muted.current ? "Muted" : "Alerts on"}
        </button>
      </div>

      {(orders ?? []).length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No orders yet. New orders will ring here in real time.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {BUCKETS.map((b) => (
            <div key={b.key} className="rounded-2xl border border-border/60 bg-card p-3">
              <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{b.title}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground/70">{grouped[b.key].length}</span>
              </h2>
              <div className="space-y-2">
                {grouped[b.key].length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground/70">—</p>}
                {grouped[b.key].map((o: any) => <OrderCard key={o.id} o={o} onStatus={setStatus} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ o, onStatus }: { o: any; onStatus: (id: string, s: OrderStatus) => void }) {
  const items: any[] = Array.isArray(o.items) ? o.items : [];
  const addr = o.shipping_address ?? {};
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">#{String(o.id).slice(0, 8)}</span>
        <span className="font-semibold">{inr(Number(o.total))}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
      <ul className="mt-2 space-y-0.5 text-xs">
        {items.slice(0, 3).map((i, idx) => (
          <li key={idx} className="line-clamp-1">{i.qty}× {i.title}</li>
        ))}
        {items.length > 3 && <li className="text-muted-foreground">+{items.length - 3} more</li>}
      </ul>
      {addr.name && (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
          To {addr.name} · {[addr.line1, addr.city, addr.pincode].filter(Boolean).join(", ")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.status === "placed" && (
          <>
            <Button size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => onStatus(o.id, "accepted")}>Accept</Button>
            <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" onClick={() => onStatus(o.id, "cancelled")}>Reject</Button>
          </>
        )}
        {o.status === "accepted" && (
          <>
            <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" onClick={() => onStatus(o.id, "preparing")}>Start prep</Button>
            <Button size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => onStatus(o.id, "shipped")}>Mark ready</Button>
          </>
        )}
        {o.status === "preparing" && (
          <Button size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => onStatus(o.id, "shipped")}>Mark ready</Button>
        )}
        {o.status === "shipped" && !o.delivery_partner_id && (
          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-warning">Waiting for rider…</span>
        )}
        {o.status === "shipped" && o.delivery_partner_id && (
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">Rider on the way</span>
        )}
        {o.status === "delivered" && (
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success">Delivered</span>
        )}
        {(o.status === "cancelled" || o.status === "refunded") && (
          <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-medium text-destructive capitalize">{o.status}</span>
        )}
      </div>
    </div>
  );
}

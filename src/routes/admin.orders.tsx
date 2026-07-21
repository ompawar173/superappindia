import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Filter, MapPin, Package, Phone, Search, Store, Truck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/format";
import { adminAssignOrder } from "@/lib/admin-riders.functions";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending", statuses: ["placed"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted", "preparing", "shipped"] },
  { key: "picked", label: "Picked up", delivery: ["picked_up"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "refunded"] },
] as const;

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  preparing: "bg-amber-100 text-amber-700",
  shipped: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-rose-100 text-rose-700",
};

function AdminOrders() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, delivery_status, total, subtotal, tax, items, shipping_address, created_at, user_id, delivery_partner_id, vendor_id, payment_ref, vendors(business_name, city), delivery_partner:delivery_partners!orders_delivery_partner_id_fkey(full_name, phone, rider_code, vehicle_type, vehicle_number)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20000,
  });

  const filtered = useMemo(() => {
    const list = orders ?? [];
    const f = FILTERS.find((x) => x.key === filter)!;
    const byStatus = list.filter((o: any) => {
      if (filter === "all") return true;
      if ("delivery" in f && f.delivery) return f.delivery.includes(o.delivery_status);
      if ("statuses" in f && f.statuses) return f.statuses.includes(o.status);
      return true;
    });
    if (!q.trim()) return byStatus;
    const needle = q.trim().toLowerCase();
    return byStatus.filter((o: any) =>
      String(o.order_number ?? "").toLowerCase().includes(needle) ||
      String(o.vendors?.business_name ?? "").toLowerCase().includes(needle) ||
      String(o.shipping_address?.name ?? "").toLowerCase().includes(needle) ||
      String(o.shipping_address?.phone ?? "").toLowerCase().includes(needle),
    );
  }, [orders, filter, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Every order in one place. Filter, search, and assign riders.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Order #, shop, customer…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No orders match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => <OrderRow key={o.id} o={o} />)}
        </div>
      )}
    </div>
  );
}

function OrderRow({ o }: { o: any }) {
  const [open, setOpen] = useState(false);
  const addr = o.shipping_address ?? {};
  const items = Array.isArray(o.items) ? o.items : [];
  const status = String(o.status);
  const dStatus = o.delivery_status ? String(o.delivery_status) : null;
  const rider = o.delivery_partner;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">{o.order_number}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status] ?? "bg-muted"}`}>
              {status}
            </span>
            {dStatus && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">
                {dStatus.replace(/_/g, " ")}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {o.vendors?.business_name && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Store className="h-3.5 w-3.5 text-primary" /> {o.vendors.business_name}
                {o.vendors?.city ? <span className="opacity-70">· {o.vendors.city}</span> : null}
              </span>
            )}
            {addr.name && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <User className="h-3.5 w-3.5" /> {addr.name}
              </span>
            )}
            {addr.phone && (
              <a href={`tel:${addr.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" /> {addr.phone}
              </a>
            )}
            {(addr.line1 || addr.city) && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {[addr.line1, addr.city, addr.pincode].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}: {items.map((i: any) => `${i.qty ?? 1}× ${i.title ?? i.name ?? "Item"}`).join(", ")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold">{inr(Number(o.total))}</p>
          <p className="text-[11px] text-muted-foreground">
            {o.payment_ref ? <>Paid · <span className="font-mono">{String(o.payment_ref).slice(0, 10)}</span></> : "Cash / Pending"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-2 text-xs">
          <Truck className="h-4 w-4 text-primary" />
          {rider ? (
            <span>
              <b>{rider.full_name}</b>
              <span className="text-muted-foreground"> · {rider.rider_code}</span>
              {rider.vehicle_number && <span className="text-muted-foreground"> · {rider.vehicle_type} {rider.vehicle_number}</span>}
              {rider.phone && (
                <> · <a href={`tel:${rider.phone}`} className="text-primary hover:underline">{rider.phone}</a></>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">No rider assigned</span>
          )}
        </div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
          {rider ? "Reassign rider" : "Assign rider"}
        </Button>
      </div>

      <AssignDialog open={open} onOpenChange={setOpen} order={o} />
    </div>
  );
}

function AssignDialog({ open, onOpenChange, order }: { open: boolean; onOpenChange: (v: boolean) => void; order: any }) {
  const qc = useQueryClient();
  const assign = useServerFn(adminAssignOrder);
  const [riderId, setRiderId] = useState<string>(order.delivery_partner_id ?? "");
  const [saving, setSaving] = useState(false);

  const { data: riders } = useQuery({
    queryKey: ["admin-active-riders"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("delivery_partners")
        .select("user_id, full_name, rider_code, city, vehicle_type, is_online")
        .eq("kyc_status", "approved").eq("is_disabled", false)
        .order("is_online", { ascending: false })
        .order("full_name");
      return data ?? [];
    },
  });

  const submit = async (unassign = false) => {
    setSaving(true);
    try {
      await assign({ data: { order_id: order.id, rider_user_id: unassign ? null : riderId || null } });
      toast.success(unassign ? "Unassigned" : "Rider assigned");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign rider · {order.order_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Only approved, active riders are listed.</p>
          <Select value={riderId} onValueChange={setRiderId}>
            <SelectTrigger><SelectValue placeholder="Choose a rider" /></SelectTrigger>
            <SelectContent>
              {(riders ?? []).map((r: any) => (
                <SelectItem key={r.user_id} value={r.user_id}>
                  {r.is_online ? "🟢 " : "⚪ "}{r.full_name} · {r.rider_code} · {r.city}
                </SelectItem>
              ))}
              {(!riders || riders.length === 0) && <div className="p-3 text-xs text-muted-foreground">No active riders.</div>}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-between">
          {order.delivery_partner_id && (
            <Button variant="ghost" className="text-destructive" disabled={saving} onClick={() => submit(true)}>Unassign</Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!riderId || saving} onClick={() => submit(false)}>Assign</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

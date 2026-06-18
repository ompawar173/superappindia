import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Package, Bike, BellRing, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { notificationSound } from "@/lib/notification-sound";

export const Route = createFileRoute("/delivery/available")({ component: AvailableOrders });

function AvailableOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: partner } = useQuery({
    queryKey: ["rider", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("delivery_partners").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const approved = partner?.kyc_status === "approved";

  const muted = useRef(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["available-orders"],
    enabled: !!approved,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,shipping_address,items,created_at,vendor_id,vendors(business_name,address)")
        .is("delivery_partner_id", null)
        .in("status", ["accepted", "preparing", "shipped"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  // Realtime new orders → refresh pool
  useEffect(() => {
    if (!approved) return;
    const ch = supabase
      .channel("available-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["available-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [approved, qc]);

  // Ringing sound while there are pickups available
  const count = orders?.length ?? 0;
  useEffect(() => {
    if (count > 0 && !muted.current) notificationSound.start();
    else notificationSound.stop();
    return () => notificationSound.stop();
  }, [count]);

  const claim = async (orderId: string, payout: number) => {
    if (!user) return;
    // Atomic claim: only succeeds if still unassigned
    const { data: claimed, error } = await supabase
      .from("orders")
      .update({ delivery_partner_id: user.id, delivery_status: "assigned" })
      .eq("id", orderId)
      .is("delivery_partner_id", null)
      .select("id")
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!claimed) { toast.error("Already taken by another rider"); qc.invalidateQueries({ queryKey: ["available-orders"] }); return; }

    const { error: aerr } = await supabase.from("delivery_assignments").insert({
      order_id: orderId,
      partner_id: user.id,
      status: "assigned",
      payout_amount: payout,
    });
    if (aerr) { toast.error(aerr.message); return; }

    toast.success("Order picked up — see Trips");
    qc.invalidateQueries({ queryKey: ["available-orders"] });
    qc.invalidateQueries({ queryKey: ["rider-active", user.id] });
    qc.invalidateQueries({ queryKey: ["rider-trips", user.id] });
  };

  if (!partner) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Complete onboarding to view available orders.</p>;
  }
  if (!approved) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Available orders unlock once your KYC is approved.</p>;
  }
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;

  if (!orders?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Bike className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No orders to pick up right now. Stay online — new ones appear here live.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-bold">Available pickups</h1>
      {orders.map((o: any) => {
        const addr = o.shipping_address ?? {};
        const itemCount = Array.isArray(o.items) ? o.items.reduce((s: number, i: any) => s + (i.qty ?? 1), 0) : 0;
        const payout = Math.max(25, Math.round(Number(o.total) * 0.1));
        return (
          <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                <p className="font-semibold">{o.vendors?.name ?? "Vendor"}</p>
                <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-2">{[addr.line1, addr.city, addr.pincode].filter(Boolean).join(", ")}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Package className="h-3 w-3" /> {itemCount} item{itemCount === 1 ? "" : "s"} · {inr(Number(o.total))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Earn</p>
                <p className="font-display text-lg font-bold text-primary">{inr(payout)}</p>
              </div>
            </div>
            <Button onClick={() => claim(o.id, payout)} className="mt-3 w-full rounded-full" size="sm">
              Pick up
            </Button>
          </div>
        );
      })}
    </div>
  );
}

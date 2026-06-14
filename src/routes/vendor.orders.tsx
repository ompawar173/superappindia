import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/vendor/orders")({ component: VendorOrders });

function VendorOrders() {
  const { user } = useAuth();
  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vendors").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: orders } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    enabled: !!vendor,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("vendor_id", vendor!.id).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <p className="text-sm text-muted-foreground">Customer orders for your listings.</p>
      {(orders ?? []).length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No orders yet. Promote your listings to get noticed.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Order</th><th>Date</th><th>Status</th><th className="text-right p-3">Total</th></tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o: any) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="p-3 font-mono text-xs">#{String(o.id).slice(0, 8)}</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="capitalize">{o.status}</td>
                  <td className="p-3 text-right font-semibold">{inr(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

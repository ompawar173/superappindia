import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/delivery/assignments")({ component: Trips });

function Trips() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["rider-trips", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_assignments")
        .select("*, orders(total)")
        .eq("partner_id", user!.id)
        .order("assigned_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!data?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Package className="mx-auto h-7 w-7 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No trips yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((t: any) => (
        <div key={t.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">{new Date(t.assigned_at).toLocaleString()}</p>
            <p className="font-medium">Order #{String(t.order_id).slice(0, 6)}</p>
            <p className="text-xs capitalize text-muted-foreground">{t.status.replace("_", " ")}</p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold">{formatINR(Number(t.orders?.total ?? 0))}</p>
            <p className="text-xs text-primary">+{formatINR(Number(t.payout_amount ?? 0))}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

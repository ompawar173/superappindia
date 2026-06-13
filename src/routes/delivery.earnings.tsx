import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/delivery/earnings")({ component: Earnings });

function Earnings() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["rider-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_earnings_ledger")
        .select("*")
        .eq("partner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const total = (data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary-soft/40 to-card p-6 shadow-soft">
        <Wallet className="h-6 w-6 text-primary" />
        <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Lifetime earnings</p>
        <p className="font-display text-3xl font-bold">{formatINR(total)}</p>
      </div>
      <div className="space-y-2">
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 text-sm">
            <div>
              <p className="font-medium capitalize">{r.type.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <p className="font-display font-bold text-primary">+{formatINR(Number(r.amount))}</p>
          </div>
        ))}
        {!data?.length && <p className="py-6 text-center text-sm text-muted-foreground">No earnings yet.</p>}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ondc")({ component: OndcAdmin });

function OndcAdmin() {
  const { data: participants } = useQuery({
    queryKey: ["ondc-participants"],
    queryFn: async () => (await supabase.from("ondc_participants").select("*")).data ?? [],
  });
  const { data: txs } = useQuery({
    queryKey: ["ondc-tx"],
    queryFn: async () =>
      (await supabase.from("ondc_transactions").select("transaction_id,action,direction,status,created_at").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Globe2 className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold">ONDC Buyer App</h1>
          <p className="text-sm text-muted-foreground">Beckn protocol integration scaffold. Staging-ready.</p>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
        <div>
          <strong>Not registered yet.</strong> ONDC endpoints are built and ready. To go live: register as a Buyer NP with ONDC,
          generate Ed25519 + X25519 keypairs, and add a participant below pointing to staging.
          Callbacks live at <code className="rounded bg-card px-1">/api/public/ondc/&lt;action&gt;</code>.
        </div>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-display font-semibold">Participants</h2>
        {(participants ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No participants configured. Add one once you have your subscriber_id + signing keys.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60 text-sm">
            {participants!.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-mono text-xs">{p.subscriber_id}</div>
                  <div className="text-xs text-muted-foreground">{p.role} · {p.registry_env}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-display font-semibold">Recent transactions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2">Txn ID</th><th>Action</th><th>Direction</th><th>Status</th><th>When</th></tr>
            </thead>
            <tbody>
              {(txs ?? []).map((t: any, i: number) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="p-2 font-mono text-xs">{t.transaction_id}</td>
                  <td>{t.action}</td>
                  <td>{t.direction}</td>
                  <td>{t.status ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {(txs ?? []).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No transactions logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

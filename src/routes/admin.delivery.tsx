import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bike, CheckCircle2, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/delivery")({ component: AdminDelivery });

function AdminDelivery() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-riders", filter],
    queryFn: async () => {
      let q = supabase.from("delivery_partners").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("kyc_status", filter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-riders"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Delivery Partners</h1>
          <p className="text-sm text-muted-foreground">Review KYC, approve riders, manage live workforce.</p>
        </div>
        <Bike className="h-7 w-7 text-primary" />
      </div>

      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}>{f}</button>
        ))}
      </div>

      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        : !data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No riders.</p>
        : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">KYC</th>
                  <th className="p-3">Online</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.user_id} className="border-t border-border/60">
                    <td className="p-3 font-medium">{r.full_name}</td>
                    <td className="p-3 text-muted-foreground">{r.phone}</td>
                    <td className="p-3">{r.city}</td>
                    <td className="p-3 capitalize">{r.vehicle_type} · {r.vehicle_number}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        r.kyc_status === "approved" ? "bg-success/10 text-success-foreground"
                        : r.kyc_status === "rejected" ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning-foreground"
                      }`}>{r.kyc_status}</span>
                    </td>
                    <td className="p-3">{r.is_online ? <span className="text-primary">●</span> : <span className="text-muted-foreground">○</span>}</td>
                    <td className="p-3 text-right">
                      <RiderActions rider={r} onChange={refetch} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function RiderActions({ rider, onChange }: { rider: any; onChange: () => void }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const approve = async () => {
    const { error: e1 } = await supabase.from("delivery_partners")
      .update({ kyc_status: "approved", kyc_rejection_reason: null }).eq("user_id", rider.user_id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("user_roles")
      .upsert({ user_id: rider.user_id, role: "delivery" }, { onConflict: "user_id,role" });
    if (e2) return toast.error(e2.message);
    toast.success("Rider approved");
    onChange();
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error("Reason required");
    const { error } = await supabase.from("delivery_partners")
      .update({ kyc_status: "rejected", kyc_rejection_reason: reason }).eq("user_id", rider.user_id);
    if (error) return toast.error(error.message);
    toast.success("Rider rejected");
    setOpen(false);
    onChange();
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{rider.full_name} — documents</DialogTitle></DialogHeader>
          <DocList partnerId={rider.user_id} />
        </DialogContent>
      </Dialog>
      {rider.kyc_status !== "approved" && (
        <Button size="sm" onClick={approve}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>
      )}
      {rider.kyc_status !== "rejected" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject {rider.full_name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Reason (shown to rider)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. DL blurry, please re-upload" />
            </div>
            <DialogFooter><Button variant="destructive" onClick={reject}>Reject</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DocList({ partnerId }: { partnerId: string }) {
  const { data } = useQuery({
    queryKey: ["admin-docs", partnerId],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_documents").select("*").eq("partner_id", partnerId);
      const withUrls = await Promise.all(
        (data ?? []).map(async (d: any) => {
          const { data: signed } = await supabase.storage.from("delivery-kyc").createSignedUrl(d.storage_path, 600);
          return { ...d, url: signed?.signedUrl };
        }),
      );
      return withUrls;
    },
  });
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data.length) return <p className="text-sm text-muted-foreground">No documents uploaded.</p>;
  return (
    <ul className="space-y-2">
      {data.map((d: any) => (
        <li key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
          <span className="font-medium capitalize">{d.doc_type.replace("_", " ")}</span>
          {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
            : <span className="text-muted-foreground">No file</span>}
        </li>
      ))}
    </ul>
  );
}

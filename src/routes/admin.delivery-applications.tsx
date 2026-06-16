import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/delivery-applications")({
  component: AdminDeliveryApps,
});

function AdminDeliveryApps() {
  const qc = useQueryClient();

  const { data: apps, isLoading } = useQuery({
    queryKey: ["admin-delivery-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_partner_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("delivery_partner_applications")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(`Marked ${v.status}`);
      qc.invalidateQueries({ queryKey: ["admin-delivery-apps"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Bike className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold">Rider applications</h1>
          <p className="text-sm text-muted-foreground">Review riders who applied through the public Apply form.</p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (apps ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No applications yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(apps ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{a.full_name}{a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{a.phone}</div>
                    {a.email && <div className="text-muted-foreground">{a.email}</div>}
                  </td>
                  <td className="px-4 py-3">{a.city}</td>
                  <td className="px-4 py-3 capitalize">{a.vehicle_type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(a.created_at), "dd MMM, HH:mm")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      a.status === "approved" ? "bg-success/15 text-success" :
                      a.status === "rejected" ? "bg-destructive/15 text-destructive" :
                      "bg-warning/15 text-warning-foreground"
                    }`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "rejected" })}>
                          <X className="mr-1 h-3 w-3" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => setStatus.mutate({ id: a.id, status: "approved" })}>
                          <Check className="mr-1 h-3 w-3" /> Approve
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Approving an application here flags it for your team. The applicant still needs to sign in and complete onboarding (KYC upload) on the rider app before they can go live.
      </p>
    </div>
  );
}

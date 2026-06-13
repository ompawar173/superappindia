import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/vendors")({ component: VendorsAdmin });

function VendorsAdmin() {
  const qc = useQueryClient();
  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id,business_name,city,gstin,kyc_status,user_id,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, kyc_status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("vendors").update({ kyc_status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Vendor ${kyc_status}`);
    qc.invalidateQueries({ queryKey: ["admin-vendors"] });
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Vendors</h1>
      <p className="text-sm text-muted-foreground">Approve KYC for vendor partners.</p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Business</th><th>City</th><th>GSTIN</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(vendors ?? []).map((v: any) => (
              <tr key={v.id} className="border-t border-border/60">
                <td className="p-3 font-medium">{v.business_name}</td>
                <td>{v.city ?? "—"}</td>
                <td className="font-mono text-xs">{v.gstin ?? "—"}</td>
                <td className="capitalize">{v.kyc_status}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setStatus(v.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(v.id, "rejected")}>Reject</Button>
                  </div>
                </td>
              </tr>
            ))}
            {(vendors ?? []).length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

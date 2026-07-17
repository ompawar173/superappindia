import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MapPin, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/service-requests")({ component: AdminServiceRequests });

const STATUSES = ["new", "assigned", "in_progress", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

function AdminServiceRequests() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-service-requests", filter],
    queryFn: async () => {
      let q = supabase.from("service_requests").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("service_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
  };

  const list = requests ?? [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Service Requests</h1>
          <p className="text-sm text-muted-foreground">{list.length} request(s) · customer bookings for home & kitchen services.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          No service requests {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{r.service_name || r.service_slug || "Service"}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium">{r.name}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" /> {r.phone}</a>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.address}{r.city ? `, ${r.city}` : ""}{r.pincode ? ` — ${r.pincode}` : ""}</span>
                    {r.scheduled_for && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.scheduled_for).toLocaleString()}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.notes && <p className="mt-2 rounded-lg bg-muted/40 p-2 text-xs">{r.notes}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${r.phone}`}><Phone className="mr-1 h-3 w-3" /> Call</a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-primary-soft text-primary",
    assigned: "bg-accent text-accent-foreground",
    in_progress: "bg-warning/20 text-warning",
    completed: "bg-success/20 text-success",
    cancelled: "bg-destructive/20 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status] ?? "bg-muted"}`}>{status.replace("_", " ")}</span>;
}

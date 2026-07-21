import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Bike, CheckCircle2, XCircle, Eye, Plus, KeyRound, Ban, Play, Trash2, Copy, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminCreateRider, adminDeleteRider, adminResetRiderPassword,
  adminSetRiderDisabled, adminUpdateRider,
} from "@/lib/admin-riders.functions";

export const Route = createFileRoute("/admin/delivery")({ component: AdminDelivery });

function AdminDelivery() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "disabled">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-riders", filter],
    queryFn: async () => {
      let q = supabase.from("delivery_partners").select("*").order("created_at", { ascending: false });
      if (filter === "disabled") q = q.eq("is_disabled", true);
      else if (filter !== "all") q = q.eq("kyc_status", filter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-riders"] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Riders</h1>
          <p className="text-sm text-muted-foreground">Create Rider IDs, manage KYC, disable or reset passwords.</p>
        </div>
        <div className="flex items-center gap-2">
          <Bike className="h-6 w-6 text-primary" />
          <Button onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Create rider
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected", "disabled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}>{f}</button>
        ))}
      </div>

      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        : !data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No riders.</p>
        : (
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Rider ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">KYC</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.user_id} className="border-t border-border/60">
                    <td className="p-3 font-mono text-xs">{r.rider_code}</td>
                    <td className="p-3 font-medium">{r.full_name}</td>
                    <td className="p-3 text-muted-foreground">{r.phone}</td>
                    <td className="p-3">{r.city}</td>
                    <td className="p-3 capitalize text-xs">{r.vehicle_type} · {r.vehicle_number}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        r.kyc_status === "approved" ? "bg-emerald-100 text-emerald-700"
                        : r.kyc_status === "rejected" ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                      }`}>{r.kyc_status}</span>
                    </td>
                    <td className="p-3">
                      {r.is_disabled ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Disabled</span>
                      ) : r.is_online ? (
                        <span className="text-primary">● Online</span>
                      ) : (
                        <span className="text-muted-foreground">○ Offline</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <RiderActions rider={r} onChange={refetch} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <CreateRiderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} />
    </div>
  );
}

function RiderActions({ rider, onChange }: { rider: any; onChange: () => void }) {
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const resetPw = useServerFn(adminResetRiderPassword);
  const setDisabled = useServerFn(adminSetRiderDisabled);
  const del = useServerFn(adminDeleteRider);

  const approve = async () => {
    const { error: e1 } = await supabase.from("delivery_partners")
      .update({ kyc_status: "approved", kyc_rejection_reason: null }).eq("user_id", rider.user_id);
    if (e1) return toast.error(e1.message);
    await supabase.from("user_roles").upsert({ user_id: rider.user_id, role: "delivery" }, { onConflict: "user_id,role" });
    toast.success("Rider approved");
    onChange();
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error("Reason required");
    const { error } = await supabase.from("delivery_partners")
      .update({ kyc_status: "rejected", kyc_rejection_reason: reason }).eq("user_id", rider.user_id);
    if (error) return toast.error(error.message);
    toast.success("Rider rejected"); setRejectOpen(false); onChange();
  };

  const doReset = async () => {
    try {
      const res = await resetPw({ data: { user_id: rider.user_id } });
      setResetInfo(res.temp_password);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const toggleDisabled = async () => {
    try {
      await setDisabled({ data: { user_id: rider.user_id, disabled: !rider.is_disabled } });
      toast.success(rider.is_disabled ? "Enabled" : "Disabled");
      onChange();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const doDelete = async () => {
    try {
      await del({ data: { user_id: rider.user_id } });
      toast.success("Rider deleted"); setDeleteOpen(false); onChange();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant="ghost" title="Documents"><Eye className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{rider.full_name} — documents</DialogTitle></DialogHeader>
          <DocList partnerId={rider.user_id} />
        </DialogContent>
      </Dialog>

      <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>

      {rider.kyc_status !== "approved" && (
        <Button size="sm" variant="ghost" title="Approve KYC" onClick={approve}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>
      )}
      {rider.kyc_status !== "rejected" && (
        <Button size="sm" variant="ghost" title="Reject KYC" onClick={() => setRejectOpen(true)}><XCircle className="h-4 w-4 text-rose-600" /></Button>
      )}

      <Button size="sm" variant="ghost" title="Reset password" onClick={doReset}><KeyRound className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" title={rider.is_disabled ? "Enable" : "Disable"} onClick={toggleDisabled}>
        {rider.is_disabled ? <Play className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-amber-600" />}
      </Button>
      <Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-4 w-4 text-rose-600" />
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject {rider.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason (shown to rider)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. DL blurry, please re-upload" />
          </div>
          <DialogFooter><Button variant="destructive" onClick={reject}>Reject</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <EditRiderDialog open={editOpen} onOpenChange={setEditOpen} rider={rider} onSaved={onChange} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {rider.full_name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently deletes the rider account, login and all documents. Existing delivered orders remain.</p>
          <DialogFooter><Button variant="destructive" onClick={doDelete}>Delete rider</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetInfo !== null} onOpenChange={(v) => !v && setResetInfo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Temporary password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Share this password with the rider. They will be asked to change it on next login.</p>
          {resetInfo && <PasswordBadge value={resetInfo} />}
          <DialogFooter><Button onClick={() => setResetInfo(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditRiderDialog({ open, onOpenChange, rider, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; rider: any; onSaved: () => void }) {
  const update = useServerFn(adminUpdateRider);
  const [form, setForm] = useState({
    full_name: rider.full_name, phone: rider.phone, city: rider.city,
    vehicle_type: rider.vehicle_type, vehicle_number: rider.vehicle_number,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await update({ data: { user_id: rider.user_id, ...form } });
      toast.success("Rider updated"); onSaved(); onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {rider.rider_code}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Motorbike</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="bicycle">Bicycle</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Vehicle #</Label><Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button disabled={saving} onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateRiderDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const create = useServerFn(adminCreateRider);
  const [form, setForm] = useState({
    full_name: "", phone: "", city: "Mumbai", vehicle_type: "bike" as const, vehicle_number: "",
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ rider_code: string; temp_password: string } | null>(null);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await create({ data: form });
      setResult({ rider_code: res.rider_code, temp_password: res.temp_password });
      onCreated();
    } catch (e: any) { toast.error(e?.message ?? "Failed to create"); }
    finally { setSaving(false); }
  };

  const reset = () => {
    setResult(null);
    setForm({ full_name: "", phone: "", city: "Mumbai", vehicle_type: "bike", vehicle_number: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); else onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{result ? "Rider created" : "Create a new rider"}</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share these credentials with the rider. They will be asked to change the password after first login.</p>
            <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rider ID</p>
                <PasswordBadge value={result.rider_code} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Temporary password</p>
                <PasswordBadge value={result.temp_password} />
              </div>
            </div>
            <DialogFooter><Button onClick={reset}>Done</Button></DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>City</Label><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vehicle</Label>
                  <Select value={form.vehicle_type} onValueChange={(v: any) => setForm({ ...form, vehicle_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bike">Motorbike</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="bicycle">Bicycle</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle #</Label><Input required value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={saving} onClick={submit}>Create rider</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PasswordBadge({ value }: { value: string }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <code className="rounded-lg bg-background px-2.5 py-1.5 font-mono text-sm">{value}</code>
      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(value); toast.success("Copied"); }}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
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

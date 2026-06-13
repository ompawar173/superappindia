import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/delivery/onboarding")({ component: Onboarding });

const DOCS = [
  { type: "aadhaar", label: "Aadhaar card" },
  { type: "pan", label: "PAN card" },
  { type: "dl", label: "Driving licence" },
  { type: "rc", label: "Vehicle RC" },
  { type: "vehicle_photo", label: "Vehicle photo" },
  { type: "selfie", label: "Profile selfie" },
] as const;

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "", phone: user?.phone ?? "", city: "",
    vehicle_type: "bike", vehicle_number: "",
  });

  const { data: partner } = useQuery({
    queryKey: ["rider-onb", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("delivery_partners").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: docs, refetch: refetchDocs } = useQuery({
    queryKey: ["rider-docs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("delivery_documents").select("*").eq("partner_id", user!.id);
      return data ?? [];
    },
  });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload: any = { user_id: user!.id, ...form };
    const { error } = partner
      ? await supabase.from("delivery_partners").update(form as any).eq("user_id", user!.id)
      : await supabase.from("delivery_partners").insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["rider-onb"] });
    setStep(2);
  };

  const upload = async (docType: string, file: File) => {
    if (!user) return;
    const path = `${user.id}/${docType}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("delivery-kyc").upload(path, file, { upsert: false });
    if (upErr) return toast.error(upErr.message);
    const { error: dbErr } = await supabase.from("delivery_documents")
      .upsert({ partner_id: user.id, doc_type: docType as any, storage_path: path }, { onConflict: "partner_id,doc_type" });
    if (dbErr) return toast.error(dbErr.message);
    toast.success(`${docType} uploaded`);
    refetchDocs();
  };

  const submitForReview = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("delivery_partners")
      .update({ kyc_status: "pending" }).eq("user_id", user!.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted! We'll review within 24 hours.");
    navigate({ to: "/delivery" });
  };

  // Prefill form from partner on first load
  if (partner && form.full_name === "" && !submitting) {
    setForm({
      full_name: partner.full_name, phone: partner.phone, city: partner.city,
      vehicle_type: partner.vehicle_type, vehicle_number: partner.vehicle_number,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <StepDot n={1} active={step === 1} done={step > 1} label="Details" />
        <div className="h-px flex-1 bg-border" />
        <StepDot n={2} active={step === 2} done={false} label="Documents" />
      </div>

      {step === 1 && (
        <form onSubmit={saveProfile} className="space-y-3 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-bold">Your details</h2>
          <div>
            <Label>Full name</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="cycle">Cycle</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle number</Label>
              <Input required placeholder="MH12AB1234" value={form.vehicle_number}
                onChange={(e) => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-full">
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-3 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-bold">Upload documents</h2>
          <p className="text-xs text-muted-foreground">JPG/PNG/PDF up to 5 MB. Clear, unedited photos only.</p>
          <div className="space-y-2">
            {DOCS.map((d) => {
              const has = docs?.find((x: any) => x.doc_type === d.type);
              return (
                <label key={d.type} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    {has ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium">{d.label}</span>
                  </div>
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(d.type, e.target.files[0])} />
                  <span className="rounded-full bg-muted px-3 py-1 text-xs">{has ? "Replace" : "Upload"}</span>
                </label>
              );
            })}
          </div>
          <Button onClick={submitForReview} disabled={submitting || (docs?.length ?? 0) < 4} className="w-full rounded-full">
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
          <button onClick={() => setStep(1)} className="block w-full text-center text-xs text-muted-foreground hover:underline">
            ← Edit details
          </button>
        </div>
      )}
    </div>
  );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
        done ? "bg-primary text-primary-foreground" : active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
      }`}>{done ? "✓" : n}</span>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

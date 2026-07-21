import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, MapPin, Package, ShieldAlert, Truck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { inr } from "@/lib/format";
import { LiveMap } from "@/components/live-map";

export const Route = createFileRoute("/delivery/dashboard")({ component: RiderHome });

function RiderHome() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["rider", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("delivery_partners").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: active } = useQuery({
    queryKey: ["rider-active", user?.id],
    enabled: !!partner && partner.kyc_status === "approved",
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_assignments")
        .select("*, orders(id,order_number,total,shipping_address,items)")
        .eq("partner_id", user!.id)
        .in("status", ["assigned", "accepted", "picked_up"])
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: todayEarnings } = useQuery({
    queryKey: ["rider-today", user?.id],
    enabled: !!partner,
    queryFn: async () => {
      const since = new Date(); since.setHours(0,0,0,0);
      const { data } = await supabase
        .from("delivery_earnings_ledger")
        .select("amount")
        .eq("partner_id", user!.id)
        .gte("created_at", since.toISOString());
      return (data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    },
  });

  // Realtime: refetch active assignment when row changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`rider-${user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "delivery_assignments",
        filter: `partner_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["rider-active", user.id] });
        qc.invalidateQueries({ queryKey: ["rider-trips", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  // Live geolocation push while online (every ~20s)
  useEffect(() => {
    if (!user || !partner?.is_online || typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          await supabase.from("delivery_partners").update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
            last_location_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        },
        () => { /* permission denied — silently skip */ },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
      );
    };
    push();
    const id = setInterval(push, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user, partner?.is_online]);

  if (isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!partner) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-6 text-center shadow-soft">
        <Truck className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-lg font-bold">Welcome, future SuperApp rider</h2>
        <p className="mt-1 text-sm text-muted-foreground">Complete a short onboarding to start earning.</p>
        <Link to="/delivery/onboarding" className="mt-4 inline-block">
          <Button className="rounded-full">Start onboarding</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KycBanner status={partner.kyc_status} reason={partner.kyc_rejection_reason} />
      <OnlineCard partner={partner} disabled={partner.kyc_status !== "approved"} onChanged={() => qc.invalidateQueries({ queryKey: ["rider", user?.id] })} />

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Wallet} label="Today" value={inr(todayEarnings ?? 0)} />
        <Stat icon={Package} label="Trips" value={String(partner.total_deliveries)} />
        <Stat icon={CheckCircle2} label="Rating" value={Number(partner.rating ?? 5).toFixed(1)} />
      </div>

      {partner.is_online && (
        <div className="rounded-3xl border border-border/60 bg-card p-3 shadow-soft">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> Your live position</span>
            {partner.last_location_at && <span>Updated {new Date(partner.last_location_at).toLocaleTimeString()}</span>}
          </div>
          {partner.current_lat && partner.current_lng ? (
            <LiveMap lat={partner.current_lat} lng={partner.current_lng} emoji="🛵" height={240} />
          ) : (
            <p className="p-6 text-center text-xs text-muted-foreground">Waiting for GPS… allow location permission on your device.</p>
          )}
        </div>
      )}

      <ActiveAssignment assignment={active} />
    </div>
  );
}

function KycBanner({ status, reason }: { status: string; reason: string | null }) {
  if (status === "approved") return null;
  const variant =
    status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-warning/10 text-warning-foreground border-warning/30";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${variant}`}>
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold capitalize">KYC {status}</p>
        <p className="text-xs opacity-90">
          {status === "pending" ? "Your documents are under review (usually within 24h)."
            : reason || "Some documents need attention. Please re-upload."}
        </p>
        {status === "rejected" && (
          <Link to="/delivery/onboarding" className="mt-2 inline-block text-xs font-semibold underline">
            Re-upload documents →
          </Link>
        )}
      </div>
    </div>
  );
}

function OnlineCard({ partner, disabled, onChanged }: { partner: any; disabled: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (val: boolean) => {
    setBusy(true);
    const { error } = await supabase.from("delivery_partners")
      .update({ is_online: val, last_seen_at: new Date().toISOString() })
      .eq("user_id", partner.user_id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(val ? "You're online — orders will start coming" : "You're offline");
    onChanged();
  };
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
          <p className="font-display text-lg font-bold">{partner.is_online ? "Online" : "Offline"}</p>
          <p className="text-xs text-muted-foreground">{partner.city} • {partner.vehicle_type}</p>
        </div>
        <Switch checked={partner.is_online} disabled={disabled || busy} onCheckedChange={toggle} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-base font-bold">{value}</p>
    </div>
  );
}

function ActiveAssignment({ assignment }: { assignment: any }) {
  const qc = useQueryClient();
  if (!assignment) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <Clock className="mx-auto h-7 w-7 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No active trip. Stay online — new orders appear here instantly.</p>
      </div>
    );
  }

  const update = async (status: string, extra: Record<string, any> = {}) => {
    const stamps: Record<string, string> = {
      accepted: "accepted_at", picked_up: "picked_up_at", delivered: "delivered_at",
    };
    const patch: any = { status, ...extra };
    if (stamps[status]) patch[stamps[status]] = new Date().toISOString();
    const { error } = await supabase.from("delivery_assignments").update(patch).eq("id", assignment.id);
    if (error) return toast.error(error.message);

    if (status === "delivered") {
      await supabase.from("delivery_earnings_ledger").insert({
        partner_id: assignment.partner_id,
        assignment_id: assignment.id,
        amount: Number(assignment.payout_amount ?? 50),
        type: "delivery_fee",
      });
    }
    toast.success(`Marked ${status.replace("_", " ")}`);
    qc.invalidateQueries({ queryKey: ["rider-active"] });
    qc.invalidateQueries({ queryKey: ["rider-today"] });
  };

  const addr = assignment.orders?.shipping_address ?? {};
  return (
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-soft/40 to-background p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-primary">
          {assignment.status.replace("_", " ")}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{assignment.orders?.order_number ?? `#${String(assignment.order_id).slice(0, 6)}`}</span>
      </div>
      <p className="mt-3 font-display text-lg font-bold">{inr(Number(assignment.orders?.total ?? 0))}</p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">Drop</p>
            <p className="text-muted-foreground">{addr.line1 || "Customer address"} {addr.city ? `, ${addr.city}` : ""}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {assignment.status === "assigned" && (
          <>
            <Button variant="outline" className="rounded-full" onClick={() => update("rejected")}>Reject</Button>
            <Button className="rounded-full" onClick={() => update("accepted")}>Accept</Button>
          </>
        )}
        {assignment.status === "accepted" && (
          <Button className="col-span-2 rounded-full" onClick={() => update("picked_up")}>Mark picked up</Button>
        )}
        {assignment.status === "picked_up" && (
          <Button className="col-span-2 rounded-full" onClick={() => update("delivered")}>Mark delivered</Button>
        )}
      </div>
    </div>
  );
}

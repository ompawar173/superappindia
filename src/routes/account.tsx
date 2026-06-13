import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, ShieldCheck, Store, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isVendor } = useRoles();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wallet_ledger").select("amount").eq("user_id", user!.id);
      return (data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl gradient-brand p-6 text-primary-foreground shadow-elevated">
          <p className="text-xs uppercase tracking-wider opacity-80">SuperApp account</p>
          <h1 className="mt-1 font-display text-2xl font-bold">{profile?.full_name ?? user.email}</h1>
          <p className="text-sm opacity-90">{user.email}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-semibold">{inr(wallet ?? 0)} SuperCoins</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Tile to="/orders" label="Order history" sub="Your past orders & cashback" />
          <Tile to="/rewards" label="Rewards & referrals" sub={`Code: ${profile?.referral_code ?? "—"}`} />
          {isVendor && <Tile to="/vendor" label="Vendor dashboard" sub="Manage your catalog" icon={Store} />}
          {!isVendor && <Tile to="/vendor" label="Sell on SuperApp" sub="Become a vendor" icon={Store} />}
          {isAdmin && <Tile to="/admin" label="Admin panel" sub="Aggregator & ops" icon={ShieldCheck} />}
        </div>

        <div className="mt-6">
          <Button variant="outline" className="w-full rounded-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Tile({
  to,
  label,
  sub,
  icon: Icon = ChevronRight,
}: {
  to: string;
  label: string;
  sub: string;
  icon?: any;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
    >
      <div>
        <h3 className="font-semibold">{label}</h3>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

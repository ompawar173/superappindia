import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bike, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/delivery/auth")({
  head: () => ({ meta: [{ title: "Rider sign in — SuperApp India" }] }),
  component: RiderAuth,
});

function RiderAuth() {
  const navigate = useNavigate();
  const [riderId, setRiderId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const code = riderId.trim().toUpperCase();
    if (!code.startsWith("RDR-")) return toast.error("Enter a Rider ID like RDR-XXXXXX");
    if (password.length < 6) return toast.error("Enter your password");
    setLoading(true);
    try {
      // Resolve rider_code -> synthetic auth email
      const { data: email, error: rpcErr } = await supabase.rpc("rider_login_email", { _code: code });
      if (rpcErr) return toast.error(rpcErr.message ?? "Login failed");
      if (!email) return toast.error("Invalid Rider ID");

      const { error } = await supabase.auth.signInWithPassword({ email: email as string, password });
      if (error) return toast.error("Wrong Rider ID or password");

      // Check must_change_password
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (uid) {
        const { data: dp } = await supabase.from("delivery_partners")
          .select("must_change_password").eq("user_id", uid).maybeSingle();
        if (dp?.must_change_password) {
          navigate({ to: "/delivery/change-password" });
          return;
        }
      }
      toast.success("Signed in");
      navigate({ to: "/delivery/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-primary-soft/40 to-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Bike className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold">Rider Partner</span>
        </Link>
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <h1 className="font-display text-xl font-bold">Sign in to ride</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the Rider ID and password issued by SuperApp India admin.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <Label htmlFor="rid">Rider ID</Label>
              <Input id="rid" required autoComplete="username" placeholder="RDR-XXXXXX"
                value={riderId} onChange={(e) => setRiderId(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-4 rounded-xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Riders are onboarded by SuperApp India admin only. To become a rider,
            visit <Link to="/register" className="font-semibold text-primary hover:underline">Register</Link> or
            contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

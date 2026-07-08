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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/delivery` },
        });
        if (error) return toast.error(error.message);
        // Auto sign-in if no session returned (some Supabase configs)
        if (!data.session) {
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) return toast.error(siErr.message);
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return toast.error(error.message);
        toast.success("Signed in");
      }

      // Route to onboarding if the rider has no delivery_partners row yet
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (uid) {
        const { data: dp } = await supabase.from("delivery_partners").select("user_id").eq("user_id", uid).maybeSingle();
        if (!dp) {
          navigate({ to: "/delivery/onboarding" });
          return;
        }
      }
      navigate({ to: "/delivery" });
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
          <h1 className="font-display text-xl font-bold">
            {mode === "signin" ? "Sign in to ride" : "Create rider account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the same email and password for all future sign-ins.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 block w-full text-center text-xs text-muted-foreground hover:underline"
          >
            {mode === "signin" ? "New rider? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          By continuing you agree to SuperApp India's Rider Terms.
        </p>
      </div>
    </div>
  );
}

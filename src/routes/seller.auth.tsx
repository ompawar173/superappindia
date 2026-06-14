import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/seller/auth")({
  head: () => ({
    meta: [
      { title: "Sell on SuperApp India — Seller sign in" },
      { name: "description", content: "Grow your business with SuperApp India. List products and services, reach millions of customers." },
    ],
  }),
  component: SellerAuth,
});

function SellerAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/vendor" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: businessName }, emailRedirectTo: window.location.origin + "/vendor" },
        });
        if (error) throw error;
        toast.success("Account created. Complete your vendor profile next.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/vendor" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/vendor" });
    if (res.error) { toast.error("Google sign-in failed"); setLoading(false); return; }
    if (!res.redirected) navigate({ to: "/vendor" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between gap-6 bg-gradient-to-br from-primary to-primary-glow p-10 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="SuperApp India" className="h-9 w-auto brightness-0 invert" />
        </Link>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">Sell more on India's fastest-growing super app.</h1>
          <p className="mt-3 text-primary-foreground/90">Get discovered by millions. Add products or services in minutes — we handle payments, logistics and customer support.</p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-3"><Store className="h-5 w-5" /> Add unlimited products & services</li>
            <li className="flex items-center gap-3"><TrendingUp className="h-5 w-5" /> Reach 10M+ shoppers across India</li>
            <li className="flex items-center gap-3"><Wallet className="h-5 w-5" /> Weekly payouts, transparent dashboard</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /> Fast KYC, no setup fee</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">© SuperApp India</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-6 flex items-center justify-center md:hidden">
            <img src={logoAsset.url} alt="SuperApp India" className="h-9 w-auto" />
          </Link>
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Store className="h-3 w-3" /> Seller portal
            </span>
            <h2 className="mt-3 font-display text-xl font-bold">
              {mode === "signup" ? "Start selling today" : "Welcome back, seller"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Create your seller account in under 2 minutes." : "Sign in to manage your store."}
            </p>

            <Button onClick={handleGoogle} disabled={loading} variant="outline" className="mt-5 w-full rounded-full">
              Continue with Google
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleEmail} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="biz">Business name</Label>
                  <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full">
                {loading ? "Please wait…" : mode === "signup" ? "Create seller account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {mode === "signup" ? "Already a seller?" : "New seller?"}{" "}
              <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-semibold text-primary hover:underline">
                {mode === "signup" ? "Sign in" : "Create account"}
              </button>
            </p>
          </div>

          <div className="mt-4 text-center text-xs">
            <Link to="/auth" className="text-muted-foreground hover:text-primary">
              Shopping instead? <span className="font-semibold text-primary">Customer sign in →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

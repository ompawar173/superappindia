import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/delivery/auth")({
  head: () => ({ meta: [{ title: "Rider sign in — SuperApp" }] }),
  component: RiderAuth,
});

function RiderAuth() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const normalize = (p: string) => {
    const trimmed = p.replace(/\s+/g, "");
    return trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalize(phone) });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("OTP sent to your phone");
    setStep("otp");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalize(phone), token: otp, type: "sms",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/delivery" });
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
            {step === "phone" ? "Earn with SuperApp" : "Enter OTP"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "phone" ? "Sign in with your mobile number." : `OTP sent to ${normalize(phone)}`}
          </p>

          {step === "phone" ? (
            <form onSubmit={sendOtp} className="mt-5 space-y-3">
              <div>
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" inputMode="tel" placeholder="9876543210" required
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
                <p className="mt-1 text-[11px] text-muted-foreground">India (+91) by default</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full">
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-5 space-y-3">
              <div>
                <Label htmlFor="otp">OTP</Label>
                <Input id="otp" inputMode="numeric" maxLength={6} required
                  value={otp} onChange={(e) => setOtp(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full">
                {loading ? "Verifying…" : "Verify & continue"}
              </Button>
              <button type="button" onClick={() => setStep("phone")}
                className="block w-full text-center text-xs text-muted-foreground hover:underline">
                Change number
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          By continuing you agree to SuperApp's Rider Terms.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/delivery/change-password")({ component: ChangePw });

function ChangePw() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (pw1.length < 8) return toast.error("Choose at least 8 characters");
    if (pw1 !== pw2) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) { setLoading(false); return toast.error(error.message); }
    await supabase.from("delivery_partners")
      .update({ must_change_password: false }).eq("user_id", user.id);
    toast.success("Password updated");
    navigate({ to: "/delivery/dashboard" });
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          <h1 className="font-display text-lg font-bold">Set a new password</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          For your security, replace the temporary password issued by admin.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="pw1">New password</Label>
            <Input id="pw1" type="password" minLength={8} required value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm</Label>
            <Input id="pw2" type="password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save password
          </Button>
        </form>
      </div>
    </div>
  );
}

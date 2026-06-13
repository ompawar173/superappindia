import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/delivery/profile")({ component: Profile });

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: partner } = useQuery({
    queryKey: ["rider-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("delivery_partners").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/delivery/auth" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><User className="h-6 w-6" /></span>
          <div>
            <p className="font-display text-lg font-bold">{partner?.full_name ?? "Rider"}</p>
            <p className="text-xs text-muted-foreground">{user?.phone}</p>
          </div>
        </div>
        {partner && (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">City</dt><dd className="font-medium">{partner.city}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Vehicle</dt><dd className="font-medium capitalize">{partner.vehicle_type}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Number</dt><dd className="font-medium">{partner.vehicle_number}</dd></div>
            <div><dt className="text-xs text-muted-foreground">KYC</dt><dd className="font-medium capitalize">{partner.kyc_status}</dd></div>
          </dl>
        )}
        <Link to="/delivery/onboarding" className="mt-5 block">
          <Button variant="outline" className="w-full rounded-full">Edit details / re-upload docs</Button>
        </Link>
      </div>
      <Button onClick={signOut} variant="ghost" className="w-full text-destructive">
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}

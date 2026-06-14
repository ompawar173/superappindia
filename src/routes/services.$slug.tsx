import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Shield } from "lucide-react";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/services/$slug")({
  component: ServiceDetail,
  notFoundComponent: () => (
    <AppShell><div className="p-10 text-center text-muted-foreground">Service not found.</div></AppShell>
  ),
  errorComponent: () => (
    <AppShell><div className="p-10 text-center text-destructive">Couldn't load service.</div></AppShell>
  ),
});

function ServiceDetail() {
  const { slug } = Route.useParams();
  const { data: service, isLoading } = useQuery({
    queryKey: ["service", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) return <AppShell><div className="p-10 text-center text-muted-foreground">Loading…</div></AppShell>;
  if (!service) return null;
  const Icon = (Icons as any)[service.icon ?? "Sparkles"] ?? Icons.Sparkles;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-4 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="h-8 w-8" />
            </span>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{service.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{service.short_desc}</p>
              {service.base_price && (
                <p className="mt-3 font-display text-xl font-bold text-primary">
                  Starting at ₹{Number(service.base_price)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Perk icon={Clock} label="On-time" />
            <Perk icon={Shield} label="Verified pros" />
            <Perk icon={CheckCircle2} label="100% safe" />
          </div>

          <Button
            className="mt-6 w-full rounded-full"
            onClick={() => toast.success("Booking request placed. Our team will call you within 10 minutes.")}
          >
            Book {service.name}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Perk({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { trackAndRedirect } from "@/lib/tracking.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/r/$shortCode")({
  component: RedirectPage,
});

function RedirectPage() {
  const { shortCode } = Route.useParams();

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const res = await trackAndRedirect({
        data: {
          shortCode,
          userId: sess.session?.user.id ?? null,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        },
      });
      window.location.replace(res.url);
    })();
  }, [shortCode]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Taking you to your partner site…</p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

// Generic affiliate-network postback receiver: /api/public/postbacks/{network}
// Network-specific HMAC verification belongs here. We log + insert a conversion row.
// Supported formats can be wired per network (Cuelinks, Impact, EarnKaro, Admitad).
export const Route = createFileRoute("/api/public/postbacks/$network")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const network = (params as { network: string }).network;
        let body: any = {};
        try { body = await request.json(); } catch { body = Object.fromEntries(new URL(request.url).searchParams); }

        // TODO: per-network HMAC verification before trusting body.
        const shortCode: string | null = body.click_id ?? body.subid ?? body.s2 ?? null;
        const partnerSlug: string | null = body.partner ?? null;
        const grossAmount = Number(body.amount ?? body.gross ?? 0) || 0;
        const commissionAmount = Number(body.commission ?? 0) || 0;
        const partnerOrderId: string | null = body.order_id ?? body.txn_id ?? null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          let linkId: string | null = null;
          let partnerId: string | null = null;
          if (shortCode) {
            const { data: link } = await supabaseAdmin
              .from("affiliate_links")
              .select("id, partner_id")
              .eq("short_code", shortCode)
              .maybeSingle();
            if (link) { linkId = link.id; partnerId = link.partner_id; }
          }
          if (!partnerId && partnerSlug) {
            const { data: p } = await supabaseAdmin.from("partners").select("id").eq("slug", partnerSlug).maybeSingle();
            partnerId = p?.id ?? null;
          }
          if (!partnerId) {
            return new Response(JSON.stringify({ ok: false, error: "unknown partner" }), { status: 400 });
          }

          await supabaseAdmin.from("conversions").insert({
            link_id: linkId,
            partner_id: partnerId,
            partner_order_id: partnerOrderId,
            gross_amount: grossAmount,
            commission_amount: commissionAmount,
            status: "pending",
            network,
            payload: body,
          });
        } catch (err) {
          console.error("postback handler failed", err);
          return new Response(JSON.stringify({ ok: false }), { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

// ONDC Beckn buyer-app callback splat: /api/public/ondc/on_search, /on_select, /on_init,
// /on_confirm, /on_status, /on_update, /on_cancel, /on_rating, /on_support, /on_subscribe.
// Records every callback to `ondc_transactions` for audit. Signature verification is a TODO —
// add Ed25519 auth-header validation against ondc_participants.signing_pub_key before going live.
export const Route = createFileRoute("/api/public/ondc/$")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const action = (params as { _splat?: string })._splat ?? "unknown";
        const raw = await request.text();
        let payload: any = null;
        try { payload = JSON.parse(raw); } catch { /* keep raw */ }

        const transactionId =
          payload?.context?.transaction_id ?? `unknown-${Date.now()}`;
        const messageId = payload?.context?.message_id ?? null;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("ondc_transactions").insert({
            transaction_id: transactionId,
            message_id: messageId,
            action,
            direction: "inbound",
            status: "received",
            payload: payload ?? { raw },
          });
        } catch (err) {
          console.error("ondc audit log failed", err);
        }

        // Beckn ACK
        return Response.json({
          message: { ack: { status: "ACK" } },
        });
      },
      GET: async ({ params }) => {
        const action = (params as { _splat?: string })._splat ?? "unknown";
        return Response.json({ ok: true, action, note: "ONDC callback endpoint" });
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Haversine distance in km between two lat/lng points
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const Input = z.object({
  orderId: z.string().uuid(),
  pickup: z.object({ lat: z.number(), lng: z.number() }),
  drop: z.object({ lat: z.number(), lng: z.number() }),
  city: z.string().min(1),
  payoutAmount: z.number().nonnegative().optional(),
});

/**
 * Assigns the nearest available rider to an order.
 *
 * Algorithm: builds a small weighted graph
 *   {rider} --d1--> {pickup} --d2--> {drop}
 * where d1, d2 are haversine distances. Total cost = d1 + d2.
 * This is Dijkstra over a tiny 3-layer graph; whichever rider has the
 * shortest pickup leg wins (drop leg is identical for all candidates,
 * so it acts as a tiebreaker / total-ETA estimate).
 *
 * Drop-in upgrade: replace haversineKm() with Google Distance Matrix
 * calls (via the google_maps connector) for real road distances.
 */
export const assignNearestRider = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find available riders
    const { data: riders, error } = await supabaseAdmin
      .from("delivery_partners")
      .select("user_id, full_name, current_lat, current_lng, city")
      .eq("kyc_status", "approved")
      .eq("is_online", true)
      .eq("city", data.city)
      .not("current_lat", "is", null)
      .not("current_lng", "is", null);
    if (error) throw error;
    if (!riders || riders.length === 0) return { ok: false as const, reason: "no_riders_available" };

    // Exclude riders already on an active assignment
    const ids = riders.map((r) => r.user_id);
    const { data: busy } = await supabaseAdmin
      .from("delivery_assignments")
      .select("partner_id")
      .in("partner_id", ids)
      .in("status", ["assigned", "accepted", "picked_up"]);
    const busySet = new Set((busy ?? []).map((b: any) => b.partner_id));

    type Scored = { user_id: string; cost: number };
    const scored: Scored[] = riders
      .filter((r) => !busySet.has(r.user_id))
      .map((r) => {
        const pickupLeg = haversineKm(
          { lat: r.current_lat!, lng: r.current_lng! },
          data.pickup,
        );
        const dropLeg = haversineKm(data.pickup, data.drop);
        return { user_id: r.user_id, cost: pickupLeg + dropLeg };
      })
      .sort((a, b) => a.cost - b.cost);

    if (scored.length === 0) return { ok: false as const, reason: "all_riders_busy" };

    const winner = scored[0];
    const distanceKm = Math.round(winner.cost * 10) / 10;
    const payout = data.payoutAmount ?? Math.max(30, Math.round(20 + distanceKm * 8));

    const { data: assignment, error: insErr } = await supabaseAdmin
      .from("delivery_assignments")
      .insert({
        order_id: data.orderId,
        partner_id: winner.user_id,
        status: "assigned",
        payout_amount: payout,
        distance_km: distanceKm,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    await supabaseAdmin.from("orders").update({
      delivery_partner_id: winner.user_id,
      delivery_status: "assigned",
    }).eq("id", data.orderId);

    return { ok: true as const, assignmentId: assignment.id, riderId: winner.user_id, distanceKm, payout };
  });

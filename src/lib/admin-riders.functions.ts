import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RIDER_EMAIL_DOMAIN = "riders.superapp.local";

function generateRiderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `RDR-${s}`;
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "!7";
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    throw new Error("Forbidden: admin only");
  }
}

const CreateInput = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  city: z.string().trim().min(2).max(60),
  vehicle_type: z.enum(["bike", "scooter", "bicycle", "auto", "van"]),
  vehicle_number: z.string().trim().min(3).max(20),
});

export const adminCreateRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Unique rider_code (retry on collision)
    let riderCode = generateRiderCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("delivery_partners").select("user_id").eq("rider_code", riderCode).maybeSingle();
      if (!existing) break;
      riderCode = generateRiderCode();
    }

    const tempPassword = generateTempPassword();
    const email = `${riderCode.toLowerCase().replace(/[^a-z0-9]/g, "")}@${RIDER_EMAIL_DOMAIN}`;

    const { data: user, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, rider_code: riderCode },
    });
    if (uErr || !user.user) throw new Error(uErr?.message ?? "Failed to create auth user");

    const userId = user.user.id;

    const { error: dpErr } = await supabaseAdmin.from("delivery_partners").insert({
      user_id: userId,
      full_name: data.full_name,
      phone: data.phone,
      city: data.city,
      vehicle_type: data.vehicle_type,
      vehicle_number: data.vehicle_number,
      kyc_status: "approved",
      rider_code: riderCode,
      is_disabled: false,
      must_change_password: true,
      created_by: context.userId,
    } as any);
    if (dpErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(dpErr.message);
    }

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "delivery" as any },
      { onConflict: "user_id,role" },
    );

    return { ok: true as const, rider_code: riderCode, temp_password: tempPassword, user_id: userId };
  });

export const adminResetRiderPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = generateTempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: tempPassword });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("delivery_partners")
      .update({ must_change_password: true }).eq("user_id", data.user_id);
    return { ok: true as const, temp_password: tempPassword };
  });

export const adminSetRiderDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), disabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("delivery_partners")
      .update({ is_disabled: data.disabled, is_online: data.disabled ? false : undefined } as any)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminUpdateRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      full_name: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().min(7).max(20).optional(),
      city: z.string().trim().min(2).max(60).optional(),
      vehicle_type: z.enum(["bike", "scooter", "bicycle", "auto", "van"]).optional(),
      vehicle_number: z.string().trim().min(3).max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { user_id, ...patch } = data;
    const { error } = await supabaseAdmin.from("delivery_partners").update(patch as any).eq("user_id", user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cascade: FKs on delivery_partners / user_roles delete on user delete
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminAssignOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ order_id: z.string().uuid(), rider_user_id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.rider_user_id === null) {
      // Unassign
      await supabaseAdmin.from("delivery_assignments")
        .delete().eq("order_id", data.order_id).in("status", ["assigned", "accepted"]);
      const { error } = await supabaseAdmin.from("orders")
        .update({ delivery_partner_id: null, delivery_status: null }).eq("id", data.order_id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }

    // Ensure rider is active
    const { data: rider } = await supabaseAdmin.from("delivery_partners")
      .select("is_disabled, kyc_status").eq("user_id", data.rider_user_id).maybeSingle();
    if (!rider) throw new Error("Rider not found");
    if (rider.is_disabled) throw new Error("Rider is disabled");
    if (rider.kyc_status !== "approved") throw new Error("Rider not approved");

    // Remove any existing pending assignment for this order
    await supabaseAdmin.from("delivery_assignments")
      .delete().eq("order_id", data.order_id).in("status", ["assigned", "accepted"]);

    const { error: aErr } = await supabaseAdmin.from("delivery_assignments").insert({
      order_id: data.order_id,
      partner_id: data.rider_user_id,
      status: "assigned",
      payout_amount: 50,
    });
    if (aErr) throw new Error(aErr.message);

    const { error: oErr } = await supabaseAdmin.from("orders").update({
      delivery_partner_id: data.rider_user_id,
      delivery_status: "assigned",
    }).eq("id", data.order_id);
    if (oErr) throw new Error(oErr.message);

    return { ok: true as const };
  });

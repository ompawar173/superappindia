import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  shortCode: z.string().min(1),
  userId: z.string().uuid().nullable().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
});

// Public: log a click and return the destination URL with UTM params appended.
export const trackAndRedirect = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error } = await supabaseAdmin
      .from("affiliate_links")
      .select("id, target_url, utm_source, utm_medium, utm_campaign, utm_content, active")
      .eq("short_code", data.shortCode)
      .maybeSingle();
    if (error) throw error;
    if (!link || !link.active) return { ok: false as const, url: "/" };

    await supabaseAdmin.from("link_clicks").insert({
      link_id: link.id,
      user_id: data.userId ?? null,
      user_agent: data.userAgent?.slice(0, 500) ?? null,
      referrer: data.referrer?.slice(0, 500) ?? null,
      device: /Mobi|Android/i.test(data.userAgent ?? "") ? "mobile" : "desktop",
    });

    const url = new URL(link.target_url);
    url.searchParams.set("utm_source", link.utm_source);
    url.searchParams.set("utm_medium", link.utm_medium);
    if (link.utm_campaign) url.searchParams.set("utm_campaign", link.utm_campaign);
    if (link.utm_content) url.searchParams.set("utm_content", link.utm_content);
    return { ok: true as const, url: url.toString() };
  });

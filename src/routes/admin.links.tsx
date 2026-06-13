import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/links")({ component: LinksAdmin });

function shortCode() {
  return Math.random().toString(36).slice(2, 9);
}

function LinksAdmin() {
  const { data: links } = useQuery({
    queryKey: ["admin-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("id,short_code,campaign,channel,utm_source,utm_medium,utm_campaign,target_url,active,partners(name,slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-link-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("link_clicks").select("link_id");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { counts[r.link_id] = (counts[r.link_id] ?? 0) + 1; });
      return counts;
    },
  });

  const copy = (code: string) => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Tracked URL copied");
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">UTM / Affiliate links</h1>
          <p className="text-sm text-muted-foreground">Generate tracked redirect links per partner, campaign, channel.</p>
        </div>
        <NewLinkDialog />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Code</th><th>Partner</th><th>Campaign</th><th>Channel</th><th>Clicks</th><th></th></tr>
          </thead>
          <tbody>
            {(links ?? []).map((l: any) => (
              <tr key={l.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">/r/{l.short_code}</td>
                <td>{l.partners?.name}</td>
                <td>{l.utm_campaign ?? l.campaign ?? "—"}</td>
                <td>{l.channel ?? "—"}</td>
                <td className="font-semibold">{stats?.[l.id] ?? 0}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => copy(l.short_code)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {(links ?? []).length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No links yet — create your first tracked link.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewLinkDialog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [campaign, setCampaign] = useState("");
  const [channel, setChannel] = useState("web");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: partners } = useQuery({
    queryKey: ["admin-partner-options"],
    queryFn: async () => (await supabase.from("partners").select("id,name,base_url").order("name")).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("affiliate_links").insert({
      partner_id: partnerId,
      campaign, channel,
      utm_campaign: utmCampaign || campaign || null,
      utm_source: "superapp", utm_medium: "affiliate",
      target_url: targetUrl,
      short_code: shortCode(),
      created_by: user?.id ?? null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Link created");
    qc.invalidateQueries({ queryKey: ["admin-links"] });
    setOpen(false); setPartnerId(""); setCampaign(""); setUtmCampaign(""); setTargetUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New link</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate UTM link</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Partner</Label>
            <select
              value={partnerId}
              onChange={(e) => {
                setPartnerId(e.target.value);
                const p: any = (partners ?? []).find((x: any) => x.id === e.target.value);
                if (p && !targetUrl) setTargetUrl(p.base_url ?? "");
              }}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— select —</option>
              {(partners ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><Label>Target URL</Label><Input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Campaign</Label><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="diwali-2026" /></div>
            <div><Label>Channel</Label><Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="web / app / whatsapp" /></div>
          </div>
          <div><Label>utm_campaign (optional)</Label><Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} /></div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">
            {loading ? "Creating…" : "Generate link"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

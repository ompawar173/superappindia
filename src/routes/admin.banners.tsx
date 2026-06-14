import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/banners")({ component: AdminBanners });

function AdminBanners() {
  const qc = useQueryClient();
  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("sort_order")).data ?? [],
  });

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("banners").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Home Banners</h1>
          <p className="text-sm text-muted-foreground">Sliding banner carousel on the home page.</p>
        </div>
        <NewBannerDialog />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(banners ?? []).map((b: any) => (
          <div key={b.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="aspect-[16/8] bg-muted">
              {b.image_url ? (
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold leading-tight">{b.title}</h3>
              <p className="text-xs text-muted-foreground">{b.subtitle}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={b.active} onCheckedChange={(v) => toggle(b.id, v)} />
                  <span>{b.active ? "Live" : "Hidden"}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewBannerDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("99");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("banners").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
      const { error } = await supabase.from("banners").insert({
        title, subtitle: subtitle || null, image_url: imageUrl,
        cta_label: ctaLabel || null, cta_url: ctaUrl || null,
        sort_order: Number(sortOrder) || 99, active: true,
      });
      if (error) throw error;
      toast.success("Banner created");
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      setOpen(false); setTitle(""); setSubtitle(""); setCtaLabel(""); setCtaUrl(""); setFile(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New banner</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New banner</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label>Subtitle</Label><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA label</Label><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Shop now" /></div>
            <div><Label>CTA URL</Label><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/c/grocery" /></div>
          </div>
          <div><Label>Sort order</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
          <div><Label>Image *</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">{loading ? "Saving…" : "Create banner"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/services")({ component: AdminServices });

type Service = {
  id: string;
  slug: string;
  name: string;
  short_desc: string | null;
  icon: string | null;
  image_url: string | null;
  base_price: number | null;
  sort_order: number | null;
  active: boolean;
};

const BUCKET = "service-images";

async function uploadServiceImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function AdminServices() {
  const qc = useQueryClient();
  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => (await supabase.from("services").select("*").order("sort_order")).data ?? [],
  });

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("services").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-services"] });
    qc.invalidateQueries({ queryKey: ["services"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-services"] });
    qc.invalidateQueries({ queryKey: ["services"] });
  };

  const list = (services ?? []) as Service[];
  const liveCount = list.filter((s) => s.active).length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">SuperApp Services</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} total · {liveCount} live · shown on the app home page.
          </p>
        </div>
        <ServiceDialog />
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          No services yet. Add your first one to display it on the app.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const Icon = (Icons as any)[s.icon ?? "Sparkles"] ?? Icons.Sparkles;
            return (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
                <div className="relative aspect-[16/9] bg-muted">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
                      <Icon className="h-10 w-10 text-primary/70" />
                    </div>
                  )}
                  {!s.active && (
                    <span className="absolute left-2 top-2 rounded-full bg-warning/90 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">Hidden</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{s.name}</h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{s.short_desc || "—"}</p>
                      {s.base_price && <p className="mt-1 text-xs font-semibold text-primary">from ₹{Number(s.base_price)}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Switch checked={s.active} onCheckedChange={(v) => toggle(s.id, v)} />
                      <span>{s.active ? "Live" : "Hidden"}</span>
                    </div>
                    <div className="flex gap-1">
                      <ServiceDialog existing={s} />
                      <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceDialog({ existing }: { existing?: Service }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("99");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setSlug(existing.slug);
      setDesc(existing.short_desc ?? "");
      setIcon(existing.icon ?? "Sparkles");
      setPrice(existing.base_price ? String(existing.base_price) : "");
      setSortOrder(String(existing.sort_order ?? 99));
      setImageUrl(existing.image_url ?? null);
    } else {
      setName(""); setSlug(""); setDesc(""); setIcon("Sparkles"); setPrice(""); setSortOrder("99"); setImageUrl(null);
    }
  }, [open, existing]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadServiceImage(file);
      setImageUrl(url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      short_desc: desc || null,
      icon,
      base_price: price ? Number(price) : null,
      sort_order: Number(sortOrder) || 99,
      image_url: imageUrl,
    };
    const { error } = existing
      ? await supabase.from("services").update(payload).eq("id", existing.id)
      : await supabase.from("services").insert({ ...payload, active: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Service updated" : "Service created");
    qc.invalidateQueries({ queryKey: ["admin-services"] });
    qc.invalidateQueries({ queryKey: ["services"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New service</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Cover image</Label>
            <div className="mt-1 flex items-center gap-3">
              <div className="grid h-20 w-32 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading…</> : imageUrl ? "Replace" : "Upload"}
                </Button>
                {imageUrl && (
                  <button type="button" onClick={() => setImageUrl(null)} className="text-[11px] text-destructive hover:underline">Remove</button>
                )}
              </div>
            </div>
          </div>
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></div>
          <div><Label>Short description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Lucide icon</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Wrench" /></div>
            <div><Label>From price (₹)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </div>
          <div><Label>Sort order</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
          <Button type="submit" disabled={loading || uploading} className="w-full rounded-full">
            {loading ? "Saving…" : existing ? "Save changes" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

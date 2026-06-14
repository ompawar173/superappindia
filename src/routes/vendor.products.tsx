import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Package, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/vendor/products")({ component: VendorProductsPage });

function VendorProductsPage() {
  return <CatalogManager kind="product" />;
}

export function CatalogManager({ kind }: { kind: "product" | "service" }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["vendor-catalog", vendor?.id, kind],
    enabled: !!vendor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_products")
        .select("*, categories(name)")
        .eq("vendor_id", vendor!.id)
        .eq("kind", kind)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("vendor_products").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["vendor-catalog"] });
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete this ${kind}?`)) return;
    const { error } = await supabase.from("vendor_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["vendor-catalog"] });
  };

  if (!vendor) {
    return <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">Complete your vendor profile first.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{kind === "product" ? "Products" : "Services"}</h1>
          <p className="text-sm text-muted-foreground">
            {kind === "product" ? "Add and manage your product catalog." : "List the services you offer."}
          </p>
        </div>
        <UpsertDialog vendorId={vendor.id} userId={user!.id} kind={kind} />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (items ?? []).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No {kind}s yet. Add your first one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(items ?? []).map((p: any) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="aspect-[4/3] bg-muted">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{p.title}</h3>
                  <span className="font-display font-bold text-primary">{inr(Number(p.price))}</span>
                </div>
                {p.mrp && Number(p.mrp) > Number(p.price) && (
                  <p className="text-xs text-muted-foreground line-through">MRP {inr(Number(p.mrp))}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {kind === "product" ? `Stock: ${p.stock}` : `${p.duration_minutes ?? 0} min · ${p.service_area ?? "—"}`}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Switch checked={p.active} onCheckedChange={(v) => toggleActive(p.id, v)} />
                    <span>{p.active ? "Live" : "Hidden"}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpsertDialog({ vendorId, userId, kind }: { vendorId: string; userId: string; kind: "product" | "service" }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("10");
  const [duration, setDuration] = useState("60");
  const [area, setArea] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ["all-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name").eq("active", true).order("sort_order")).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("vendor-products").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("vendor-products").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const payload: any = {
        vendor_id: vendorId,
        kind,
        title,
        description: desc || null,
        price: Number(price) || 0,
        mrp: mrp ? Number(mrp) : null,
        category_id: categoryId || null,
        images: imageUrl ? [imageUrl] : null,
        active: true,
      };
      if (kind === "product") payload.stock = Number(stock) || 0;
      else {
        payload.stock = 0;
        payload.duration_minutes = Number(duration) || null;
        payload.service_area = area || null;
      }

      const { error } = await supabase.from("vendor_products").insert(payload);
      if (error) throw error;

      toast.success(`${kind === "product" ? "Product" : "Service"} added`);
      qc.invalidateQueries({ queryKey: ["vendor-catalog"] });
      setOpen(false);
      setTitle(""); setDesc(""); setPrice(""); setMrp(""); setFile(null); setArea("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Add {kind}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New {kind}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label>Description</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price (₹) *</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
            <div><Label>MRP (₹)</Label><Input type="number" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} /></div>
          </div>
          {kind === "product" ? (
            <div><Label>Stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
              <div><Label>Service area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Andheri W, 5km radius" /></div>
            </div>
          )}
          <div>
            <Label>Category</Label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— select —</option>
              {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Image</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">
            {loading ? "Saving…" : `Add ${kind}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

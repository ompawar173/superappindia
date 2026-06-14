import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/services")({ component: AdminServices });

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
  };
  const remove = async (id: string) => {
    if (!confirm("Delete service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-services"] });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">SuperApp Services</h1>
          <p className="text-sm text-muted-foreground">Manage the services rail on the home page.</p>
        </div>
        <NewServiceDialog />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(services ?? []).map((s: any) => {
          const Icon = (Icons as any)[s.icon ?? "Sparkles"] ?? Icons.Sparkles;
          return (
            <div key={s.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
                <div className="flex-1">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{s.short_desc}</p>
                  {s.base_price && <p className="text-xs text-primary font-semibold mt-1">from ₹{Number(s.base_price)}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={s.active} onCheckedChange={(v) => toggle(s.id, v)} />
                  <span>{s.active ? "Live" : "Hidden"}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewServiceDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("99");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("services").insert({
      name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      short_desc: desc || null, icon, base_price: price ? Number(price) : null,
      sort_order: Number(sortOrder) || 99, active: true,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Service created");
    qc.invalidateQueries({ queryKey: ["admin-services"] });
    setOpen(false); setName(""); setSlug(""); setDesc(""); setPrice("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New service</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New service</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" /></div>
          <div><Label>Short description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Lucide icon</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Wrench" /></div>
            <div><Label>From price (₹)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </div>
          <div><Label>Sort order</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">{loading ? "Saving…" : "Create"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

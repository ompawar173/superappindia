import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/partners")({ component: PartnersAdmin });

function PartnersAdmin() {
  const { data: partners } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id,slug,name,commission_pct,type,active,featured,categories(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Partners</h1>
          <p className="text-sm text-muted-foreground">Aggregated brands and own services.</p>
        </div>
        <NewPartnerDialog />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Name</th><th>Category</th><th>Type</th><th>Commission</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(partners ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="p-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">/{p.slug}</div>
                </td>
                <td>{p.categories?.name ?? "—"}</td>
                <td className="capitalize">{p.type}</td>
                <td>{p.commission_pct}%</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                  {p.featured && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs">Featured</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewPartnerDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [commission, setCommission] = useState("3");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("sort_order")).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("partners").insert({
      name, slug, base_url: baseUrl, commission_pct: Number(commission) || 0,
      category_id: categoryId || null, type: "affiliate", active: true,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Partner created");
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
    setOpen(false); setName(""); setSlug(""); setBaseUrl(""); setCommission("3"); setCategoryId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New partner</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New partner</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} required /></div>
          <div><Label>Base URL</Label><Input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required /></div>
          <div><Label>Commission %</Label><Input type="number" step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
          <div>
            <Label>Category</Label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— select —</option>
              {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">
            {loading ? "Creating…" : "Create partner"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingCart, MapPin, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cart, useCart } from "@/lib/cart";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — SuperApp" }] }),
});

function CheckoutPage() {
  const state = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [addr, setAddr] = useState({ name: "", phone: "", line1: "", city: "", pincode: "" });

  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal > 0 ? 30 : 0;
  const total = subtotal + delivery;

  if (state.items.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h1 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add items from a shop before checking out.</p>
          <Link to="/shops" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Browse shops
          </Link>
        </div>
      </AppShell>
    );
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate({ to: "/auth" });
      return;
    }
    if (!addr.name || !addr.phone || !addr.line1 || !addr.pincode) {
      toast.error("Fill all delivery details");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      user_id: user.id,
      vendor_id: state.vendorId,
      source: "own",
      items: state.items as any,
      subtotal,
      tax: 0,
      total,
      shipping_address: addr as any,
      status: "placed",
    }).select("id").single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    cart.clear();
    toast.success("Order placed");
    navigate({ to: "/orders/$id/track", params: { id: data.id } });
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/shops" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Continue shopping
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Checkout</h1>
        {state.vendorName && <p className="text-sm text-muted-foreground">Order from <strong>{state.vendorName}</strong></p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,360px]">
          <form onSubmit={placeOrder} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Delivery address
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" value={addr.name} onChange={(v) => setAddr({ ...addr, name: v })} />
              <Field label="Phone" value={addr.phone} onChange={(v) => setAddr({ ...addr, phone: v })} />
              <div className="sm:col-span-2">
                <Field label="Address" value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} />
              </div>
              <Field label="City" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} />
              <Field label="Pincode" value={addr.pincode} onChange={(v) => setAddr({ ...addr, pincode: v })} />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow disabled:opacity-60"
            >
              {submitting ? "Placing order…" : `Place order · ${inr(total)}`}
            </button>
          </form>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold">Order summary</h2>
            <ul className="mt-3 space-y-2">
              {state.items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-3 text-sm">
                  <span className="line-clamp-1">{i.title} <span className="text-muted-foreground">× {i.qty}</span></span>
                  <span className="shrink-0 font-semibold">{inr(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="my-3 border-t border-border/60" />
            <Row label="Subtotal" value={inr(subtotal)} />
            <Row label="Delivery" value={inr(delivery)} />
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-display text-lg font-bold">{inr(total)}</span>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

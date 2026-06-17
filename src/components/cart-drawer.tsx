import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, X, Minus, Plus, Trash2 } from "lucide-react";
import { cart, useCart } from "@/lib/cart";
import { inr } from "@/lib/format";

export function CartButton() {
  const state = useCart();
  const [open, setOpen] = useState(false);
  const count = state.items.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-full border border-border bg-card p-2 transition hover:border-primary/40"
        aria-label="Open cart"
      >
        <ShoppingCart className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </button>
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const state = useCart();
  const total = state.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col bg-background shadow-elevated">
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="font-display font-bold">Your cart</h2>
            {state.vendorName && (
              <p className="text-xs text-muted-foreground">from {state.vendorName}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {state.items.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div>
                <ShoppingCart className="mx-auto h-10 w-10 opacity-30" />
                <p className="mt-2">Your cart is empty.</p>
                <Link to="/shops" onClick={onClose} className="mt-3 inline-block text-primary hover:underline">Browse shops</Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {state.items.map((i) => (
                <li key={i.productId} className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold">{i.title}</p>
                        <p className="shrink-0 text-sm font-semibold">{inr(i.price * i.qty)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{inr(i.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => cart.setQty(i.productId, i.qty - 1)} className="grid h-6 w-6 place-items-center rounded-full border border-border hover:border-primary"><Minus className="h-3 w-3" /></button>
                        <span className="min-w-5 text-center text-sm font-semibold">{i.qty}</span>
                        <button onClick={() => cart.setQty(i.productId, i.qty + 1)} className="grid h-6 w-6 place-items-center rounded-full border border-border hover:border-primary"><Plus className="h-3 w-3" /></button>
                        <button onClick={() => cart.remove(i.productId)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {state.items.length > 0 && (
          <footer className="border-t border-border/60 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-display text-lg font-bold">{inr(total)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
            >
              Proceed to checkout
            </Link>
            <button onClick={() => cart.clear()} className="mt-2 w-full text-xs text-muted-foreground hover:text-destructive">Clear cart</button>
          </footer>
        )}

      </aside>
    </div>
  );
}

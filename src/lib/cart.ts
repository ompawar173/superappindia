// Tiny localStorage-backed cart store with a single-vendor invariant.
// Adding a product from a different vendor returns { conflict: true }; the
// caller shows a confirmation dialog and then calls replaceVendor() to clear
// + insert.

import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  vendorId: string;
  title: string;
  price: number;
  image?: string | null;
  qty: number;
};

export type CartState = {
  vendorId: string | null;
  vendorName: string | null;
  items: CartItem[];
};

const KEY = "sai_cart_v1";
const empty: CartState = { vendorId: null, vendorName: null, items: [] };

function read(): CartState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    return JSON.parse(raw) as CartState;
  } catch { return empty; }
}

let state: CartState = read();
const listeners = new Set<() => void>();

function write(next: CartState) {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useCart() {
  return useSyncExternalStore(subscribe, () => state, () => empty);
}

export const cart = {
  get(): CartState { return state; },

  add(item: Omit<CartItem, "qty">, vendorName: string): { ok: true } | { conflict: true; currentVendor: string } {
    if (state.vendorId && state.vendorId !== item.vendorId) {
      return { conflict: true, currentVendor: state.vendorName ?? "another shop" };
    }
    const existing = state.items.find((i) => i.productId === item.productId);
    const items = existing
      ? state.items.map((i) => i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i)
      : [...state.items, { ...item, qty: 1 }];
    write({ vendorId: item.vendorId, vendorName, items });
    return { ok: true };
  },

  replaceVendor(item: Omit<CartItem, "qty">, vendorName: string) {
    write({ vendorId: item.vendorId, vendorName, items: [{ ...item, qty: 1 }] });
  },

  setQty(productId: string, qty: number) {
    if (qty <= 0) return cart.remove(productId);
    write({ ...state, items: state.items.map((i) => i.productId === productId ? { ...i, qty } : i) });
  },

  remove(productId: string) {
    const items = state.items.filter((i) => i.productId !== productId);
    write(items.length === 0 ? empty : { ...state, items });
  },

  clear() { write(empty); },

  total(): number {
    return state.items.reduce((s, i) => s + i.price * i.qty, 0);
  },

  count(): number {
    return state.items.reduce((s, i) => s + i.qty, 0);
  },
};

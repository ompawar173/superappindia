import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/orders")({ component: () => (
  <AppShell>
    <div className="mx-auto max-w-3xl px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-bold">Your orders</h1>
      <p className="mt-2 text-sm text-muted-foreground">When you place an order via SuperApp, it will show up here with cashback status.</p>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-sm text-muted-foreground">
        No orders yet — explore partners to get started.
      </div>
    </div>
  </AppShell>
) });

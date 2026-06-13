import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sparkles, Gift, Users } from "lucide-react";

export const Route = createFileRoute("/rewards")({ component: () => (
  <AppShell>
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">SuperCoins & rewards</h1>
      <p className="mt-2 text-sm text-muted-foreground">Earn coins on every order. Refer friends. Redeem on partner offers.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { i: Sparkles, t: "Earn", d: "Get up to 10% back on every order placed via SuperApp." },
          { i: Gift, t: "Redeem", d: "Use SuperCoins on partner offers or own services." },
          { i: Users, t: "Refer", d: "Share your code, both you and your friend earn ₹100." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-border/60 bg-card p-5">
            <c.i className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{c.t}</h3>
            <p className="text-xs text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  </AppShell>
) });

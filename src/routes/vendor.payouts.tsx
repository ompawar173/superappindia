import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/vendor/payouts")({ component: Payouts });

function Payouts() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Payouts</h1>
      <p className="text-sm text-muted-foreground">Weekly settlements and invoices.</p>
      <div className="mt-6 rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Payout dashboard coming soon. Bank details collection enabled after first order.</p>
      </div>
    </div>
  );
}

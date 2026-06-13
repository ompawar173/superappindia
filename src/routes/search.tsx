import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Search } from "lucide-react";

export const Route = createFileRoute("/search")({ component: () => (
  <AppShell>
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Search</h1>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search partners, dishes, hotels…" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Search across all partners coming soon.</p>
    </div>
  </AppShell>
) });

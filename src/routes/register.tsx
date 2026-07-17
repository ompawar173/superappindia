import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Bike, Utensils, Wrench, Truck, Scissors, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register your local business — SuperApp India" },
      { name: "description", content: "List your local shop, hotel, home service or delivery vehicle on SuperApp India. Reach customers in your city." },
      { property: "og:title", content: "Register your local business — SuperApp India" },
      { property: "og:description", content: "List your local shop, hotel, home service or delivery vehicle on SuperApp India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const kinds = [
  { icon: Store, title: "Local shopkeepers", body: "Grocery, kirana, pharmacy, electronics, fashion — sell to customers in your city." },
  { icon: Utensils, title: "Hotels & restaurants", body: "Take dine-in, pickup and delivery orders from your neighbourhood." },
  { icon: Wrench, title: "Home services", body: "Plumbers, electricians, cleaners, cooks — get bookings from nearby homes." },
  { icon: Scissors, title: "Salon & beauty", body: "Offer at-home or in-salon appointments and grow repeat customers." },
  { icon: Truck, title: "Local distributors", body: "Move goods across the city with our verified rider network." },
  { icon: Bike, title: "Delivery riders", body: "Earn daily by delivering orders. Sign up, upload docs, start riding." },
];

function RegisterPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-br from-primary-soft to-background p-8 sm:p-10">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">100% Local</span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Bring your business to SuperApp India</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            We do not list Swiggy, Zomato, Amazon or any third-party brands. SuperApp India is built for local shopkeepers, hotels, home service providers and delivery riders — right in your city.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/seller/auth" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-glow">
              Register as a shop / service
            </Link>
            <Link to="/delivery/auth" className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary">
              Sign up as a delivery rider
            </Link>
          </div>
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold">Who can join</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kinds.map((k) => (
            <div key={k.title} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><k.icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-semibold">{k.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{k.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold">Why local businesses choose us</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "Zero listing fee — pay only when you get orders",
            "Own storefront page with your logo, cover & menu",
            "Live orders sent to a rider in your area",
            "Simple email + password login, no complicated setup",
            "Dedicated admin support in your language",
            "Reach customers searching for shops near them",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {b}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

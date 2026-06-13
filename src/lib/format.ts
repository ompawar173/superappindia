export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const pct = (n: number) => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;

export function formatMwk(n: number) {
  return `MK ${n.toLocaleString("en-MW")}`;
}

export function stockLabel(s: "in" | "low" | "out") {
  if (s === "in") return "In stock";
  if (s === "low") return "Low stock";
  return "Out of stock";
}

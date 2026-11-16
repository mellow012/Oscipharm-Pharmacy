export function formatMwk(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "MK —";
  return `MK ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

const BLANTYRE_TIMEZONE = "Africa/Blantyre";

export function malawiSalesDay(createdAt: Date | string): string {
  const date = new Date(createdAt);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BLANTYRE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

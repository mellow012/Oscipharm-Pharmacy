export type SalesListFilters = {
  from: string;
  to: string;
  type: "all" | "sale" | "refund";
  search: string;
  page: number;
  importRunId: string | null;
};

export function parseSalesListFilters(params: Record<string, string | string[] | undefined>): SalesListFilters {
  const typeValue = Array.isArray(params.type) ? params.type[0] : params.type;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const searchValue = Array.isArray(params.search) ? params.search[0] : params.search;
  const fromValue = Array.isArray(params.from) ? params.from[0] : params.from;
  const toValue = Array.isArray(params.to) ? params.to[0] : params.to;
  const importRunValue = Array.isArray(params.importRunId) ? params.importRunId[0] : params.importRunId;
  const validDate = (value: string | undefined): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const today = new Date().toISOString().slice(0, 10);
  const from = validDate(fromValue) ? fromValue : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = validDate(toValue) ? toValue : today;
  const page = Number.parseInt(pageValue ?? "1", 10);
  return {
    from,
    to,
    type: typeValue === "sale" || typeValue === "refund" ? typeValue : "all",
    search: (searchValue ?? "").trim().slice(0, 100),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    importRunId: importRunValue && /^[a-zA-Z0-9_-]{1,64}$/.test(importRunValue) ? importRunValue : null,
  };
}

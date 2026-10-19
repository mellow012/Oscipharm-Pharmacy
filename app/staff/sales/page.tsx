import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { SalesFreshnessBanner } from "@/features/reports/components/SalesFreshnessBanner";
import { getSalesListData, SALES_PAGE_SIZE } from "@/features/reports/lib/sales-queries";
import { parseSalesListFilters } from "@/features/reports/lib/sales-filter";
import { can } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { formatMwk } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StaffSalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "reports:branch:view")) redirect("/unauthorized");
  const filters = parseSalesListFilters(await searchParams);
  const data = await getSalesListData({ role: session.user.role, branchId: session.user.branchId }, filters);
  const query = new URLSearchParams({ from: filters.from, to: filters.to, type: filters.type, search: filters.search, ...(filters.importRunId ? { importRunId: filters.importRunId } : {}) });
  const pageHref = (page: number) => `/staff/sales?${new URLSearchParams({ ...Object.fromEntries(query.entries()), page: String(page) }).toString()}`;

  return <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
    <StaffHeader />
    <div className="mt-5"><SalesFreshnessBanner freshness={data.freshness} /></div>
    <header className="border-b border-border py-8"><p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Receipts</p><h1 className="mt-2 text-4xl text-ink">Sales and refunds</h1></header>
    {filters.importRunId ? <p className="mt-4 text-sm text-muted">Showing receipts from import run <span className="font-mono">{filters.importRunId}</span><Link href="/staff/sales" className="ml-3 text-primary hover:underline">Clear run filter</Link></p> : null}
    <form method="get" className="grid gap-3 border-b border-border py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
      {filters.importRunId ? <input type="hidden" name="importRunId" value={filters.importRunId} /> : null}
      <label className="text-sm text-muted">From<input type="date" name="from" defaultValue={filters.from} className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" /></label>
      <label className="text-sm text-muted">To<input type="date" name="to" defaultValue={filters.to} className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" /></label>
      <label className="text-sm text-muted">Type<select name="type" defaultValue={filters.type} className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink"><option value="all">All</option><option value="sale">Sales</option><option value="refund">Refunds</option></select></label>
      <label className="text-sm text-muted">Document or product<input name="search" defaultValue={filters.search} maxLength={100} className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" /></label>
      <button className="self-end bg-primary px-4 py-2 font-medium text-primary-fg">Filter</button>
    </form>
    <section aria-label="Filtered sales totals" className="grid border-b border-border sm:grid-cols-3"><Metric label="Sales total" value={formatMwk(Number(data.totals.sales))}/><Metric label="Refunds total" value={formatMwk(Number(data.totals.refunds))}/><Metric label="Net" value={formatMwk(Number(data.totals.net))}/></section>
    <div className="mt-5 overflow-x-auto border-y border-border"><table className="w-full min-w-[780px] text-left"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="px-3 py-3 font-normal">Date/time</th><th className="px-3 py-3 font-normal">Document</th><th className="px-3 py-3 font-normal">Type</th><th className="px-3 py-3 font-normal">Lines</th><th className="px-3 py-3 text-right font-normal">Total</th><th className="px-3 py-3 font-normal">Branch</th></tr></thead><tbody className="divide-y divide-border">{data.sales.map((sale) => <tr key={sale.id} className="group relative cursor-pointer outline-none transition-colors hover:bg-surface focus-within:bg-surface"><td className="px-3 py-3 text-sm text-muted">{new Intl.DateTimeFormat("en-MW", { timeZone: "Africa/Blantyre", dateStyle: "medium", timeStyle: "short" }).format(sale.createdAt)}</td><td className="px-3 py-3 font-mono text-sm"><Link href={`/staff/sales/${sale.id}`} className="text-primary after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{sale.sourceDocumentNumber ?? sale.id}</Link></td><td className="px-3 py-3 text-sm">{sale.isRefund ? "Refund" : "Sale"}</td><td className="px-3 py-3 text-sm">{sale._count.items}</td><td className="px-3 py-3 text-right font-mono text-sm">{formatMwk(Number(sale.totalAmount))}</td><td className="px-3 py-3 text-sm text-muted">{sale.branch.name}</td></tr>)}{!data.sales.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">No receipts match these filters.</td></tr> : null}</tbody></table></div>
    <nav aria-label="Sales pages" className="flex items-center justify-between py-4 text-sm"><span className="text-muted">Page {filters.page} of {data.pageCount} · {data.totalCount} receipts</span><div className="flex gap-3">{filters.page > 1 ? <Link className="border border-border px-3 py-2" href={pageHref(filters.page - 1)}>Previous</Link> : null}{filters.page < data.pageCount ? <Link className="border border-border px-3 py-2" href={pageHref(filters.page + 1)}>Next</Link> : null}</div></nav>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border-b border-border px-4 py-4 sm:border-r"><p className="text-xs uppercase text-muted">{label}</p><p className="mt-2 font-mono text-lg text-ink">{value}</p></div>; }

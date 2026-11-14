import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SalesFreshnessBanner } from "@/features/reports/components/SalesFreshnessBanner";
import { getSalesListData } from "@/features/reports/lib/sales-queries";
import { parseSalesListFilters } from "@/features/reports/lib/sales-filter";
import { can } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { formatMwk } from "@/lib/format";
import { SubmitButton } from "@/features/marketing/components/SubmitButton";
import { FilterToolbar } from "@/features/shared/components/FilterToolbar";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";
import { LinkPagination } from "@/features/shared/components/LinkPagination";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { StatCard } from "@/features/shared/components/StatCard";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";
import { getPageNumbers } from "@/features/shared/lib/page-range";

export const dynamic = "force-dynamic";

export default async function StaffSalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "sales:view")) redirect("/unauthorized");

  const filters = parseSalesListFilters(await searchParams);
  const data = await getSalesListData(
    { role: session.user.role, branchId: session.user.branchId },
    filters,
  );
  const query = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    type: filters.type,
    search: filters.search,
    ...(filters.importRunId ? { importRunId: filters.importRunId } : {}),
  });
  const pageHref = (page: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    return `/staff/sales?${params.toString()}`;
  };

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1440px] space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <SalesFreshnessBanner freshness={data.freshness} />
      <PageHeader eyebrow="Receipts" title="Sales and refunds" />

      {filters.importRunId ? (
        <p className="flex min-w-0 flex-wrap items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
          Showing receipts from import run{" "}
          <span className="break-all font-table-cell text-table-cell">{filters.importRunId}</span>
          <Link
            href="/staff/sales"
            className="min-h-11 inline-flex items-center text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear run filter
          </Link>
        </p>
      ) : null}

      <FilterToolbar
        action="/staff/sales"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,1fr)_minmax(14rem,2fr)_auto]"
      >
        {filters.importRunId ? (
          <input type="hidden" name="importRunId" value={filters.importRunId} />
        ) : null}
        <FormField id="sales-from" label="From">
          {(fieldProps) => (
            <FormInput {...fieldProps} type="date" name="from" defaultValue={filters.from} />
          )}
        </FormField>
        <FormField id="sales-to" label="To">
          {(fieldProps) => (
            <FormInput {...fieldProps} type="date" name="to" defaultValue={filters.to} />
          )}
        </FormField>
        <FormField id="sales-type" label="Type">
          {(fieldProps) => (
            <FormSelect {...fieldProps} name="type" defaultValue={filters.type}>
              <option value="all">All</option>
              <option value="sale">Sales</option>
              <option value="refund">Refunds</option>
            </FormSelect>
          )}
        </FormField>
        <FormField id="sales-search" label="Document or product">
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="search"
              defaultValue={filters.search}
              maxLength={100}
            />
          )}
        </FormField>
        <SubmitButton className="min-h-[42px] self-end bg-primary px-space-md font-label-md text-label-md text-on-primary hover:bg-primary-container">
          Filter
        </SubmitButton>
      </FilterToolbar>

      <section
        aria-label="Filtered sales totals"
        className="grid min-w-0 grid-cols-1 gap-px border border-outline-variant bg-outline-variant sm:grid-cols-3"
      >
        <StatCard label="Sales total" value={formatMwk(Number(data.totals.sales))} tone="success" />
        <StatCard
          label="Refunds total"
          value={formatMwk(Number(data.totals.refunds))}
          tone="danger"
        />
        <StatCard label="Net" value={formatMwk(Number(data.totals.net))} />
      </section>

      <TableFrame ariaLabel="Sales and refunds ledger" tableClassName="min-w-[900px]">
        <TableHead>
          <tr>
            <TableHeaderCell>Date/time</TableHeaderCell>
            <TableHeaderCell>Document</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell align="right">Lines</TableHeaderCell>
            <TableHeaderCell align="right">Total</TableHeaderCell>
            <TableHeaderCell>Branch</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {data.sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell nowrap>
                {new Intl.DateTimeFormat("en-MW", {
                  timeZone: "Africa/Blantyre",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(sale.createdAt)}
              </TableCell>
              <TableCell nowrap className="font-table-cell text-table-cell text-primary">
                <Link
                  href={`/staff/sales/${sale.id}`}
                  className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {sale.sourceDocumentNumber ?? sale.id}
                </Link>
              </TableCell>
              <TableCell nowrap>
                <StatusBadge tone={sale.isRefund ? "danger" : "success"}>
                  {sale.isRefund ? "Refund" : "Sale"}
                </StatusBadge>
              </TableCell>
              <TableCell numeric nowrap className="text-on-surface">
                {sale._count.items}
              </TableCell>
              <TableCell numeric nowrap className="font-table-cell text-table-cell text-on-surface">
                {formatMwk(Number(sale.totalAmount))}
              </TableCell>
              <TableCell nowrap>{sale.branch.name}</TableCell>
            </TableRow>
          ))}
          {!data.sales.length ? (
            <TableRow>
              <TableCell colSpan={6} className="py-space-xl text-center">
                No receipts match these filters.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </TableFrame>

      <LinkPagination
        page={filters.page}
        pageCount={data.pageCount}
        total={data.totalCount}
        rangeStart={data.totalCount === 0 ? 0 : (filters.page - 1) * 25 + 1}
        rangeEnd={Math.min(filters.page * 25, data.totalCount)}
        pages={getPageNumbers(filters.page, data.pageCount)}
        hrefForPage={pageHref}
      />
    </div>
  );
}

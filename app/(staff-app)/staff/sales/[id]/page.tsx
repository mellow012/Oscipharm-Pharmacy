import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getSaleDetail } from "@/features/reports/lib/sales-queries";
import { can } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { formatMwk } from "@/lib/format";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
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

export const dynamic = "force-dynamic";

export default async function StaffSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "sales:view")) redirect("/unauthorized");
  const sale = await getSaleDetail(
    { role: session.user.role, branchId: session.user.branchId },
    (await params).id,
  );
  if (!sale) notFound();

  const timestamp = new Intl.DateTimeFormat("en-MW", {
    timeZone: "Africa/Blantyre",
    dateStyle: "full",
    timeStyle: "short",
  }).format(sale.createdAt);
  const receiptNumber = sale.sourceDocumentNumber ?? sale.id;

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1440px] space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <PageHeader
        eyebrow={sale.isRefund ? "Refund receipt" : "Sale receipt"}
        title={receiptNumber}
        description={`${timestamp} · ${sale.branch.name}`}
        actions={
          <>
            <Link
              href="/staff/sales"
              className="min-h-11 inline-flex items-center text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              ← Sales and refunds
            </Link>
            <StatusBadge tone={sale.isRefund ? "danger" : "success"}>
              {sale.isRefund ? "Refund" : "Sale"}
            </StatusBadge>
          </>
        }
      />

      <div className="flex min-w-0 flex-wrap items-center gap-x-space-lg gap-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
        <span>
          Payment: {sale.paymentMethod === "UNKNOWN" ? "Not recorded" : sale.paymentMethod}
        </span>
        {sale.importRun ? (
          <Link
            href={`/staff/sales?importRunId=${sale.importRun.id}`}
            className="min-h-11 inline-flex items-center text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Import run: {sale.importRun.filename}
          </Link>
        ) : null}
        {sale.isRefund ? <span>Original: {sale.refDocumentNumber ?? "Not recorded"}</span> : null}
        {sale.isRefund && sale.original ? (
          <Link
            href={`/staff/sales/${sale.original.id}`}
            className="min-h-11 inline-flex items-center text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Original sale: {sale.original.sourceDocumentNumber ?? sale.original.id}
          </Link>
        ) : null}
      </div>

      {!sale.stockAffected ? (
        <NoticeBanner tone="warning">History only, no stock change</NoticeBanner>
      ) : null}
      {sale.isRefund && !sale.original ? (
        <NoticeBanner tone="info">
          {sale.stockAffected
            ? "Original not found, restocked to RETURN batch"
            : "Original not found"}
        </NoticeBanner>
      ) : null}

      <section
        aria-label="Receipt totals"
        className="grid min-w-0 grid-cols-1 gap-px border border-outline-variant bg-outline-variant sm:grid-cols-2"
      >
        <StatCard label="Subtotal" value={formatMwk(Number(sale.subtotalAmount))} />
        <StatCard
          label="Total"
          value={formatMwk(Number(sale.totalAmount))}
          tone={sale.isRefund ? "danger" : "neutral"}
        />
      </section>

      <TableFrame ariaLabel="Receipt line items" tableClassName="min-w-[820px]">
        <TableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Aronium code</TableHeaderCell>
            <TableHeaderCell>Qty</TableHeaderCell>
            <TableHeaderCell align="right">Unit price</TableHeaderCell>
            <TableHeaderCell align="right">Line total</TableHeaderCell>
            <TableHeaderCell>Batch</TableHeaderCell>
            <TableHeaderCell>Expiry</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {sale.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="min-w-52 text-on-surface">
                {item.variant.ingredient?.name ? `${item.variant.ingredient.name} · ` : ""}
                {item.variant.brandName} {item.variant.strength ?? ""}
              </TableCell>
              <TableCell nowrap className="font-table-cell text-table-cell tabular-nums">
                {item.variant.aroniumProductLinks.length ? (
                  item.variant.aroniumProductLinks.map((link) => (
                    <span key={`${link.aroniumCode}-${link.mode}`} className="block">
                      {link.aroniumCode}
                    </span>
                  ))
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell nowrap>
                {Math.abs(item.quantityUnits)} {item.variant.unitLabel}
                {Math.abs(item.quantityUnits) === 1 ? "" : "s"}
                {item.unallocatedUnits > 0 ? (
                  <span className="ml-space-sm inline-flex">
                    <StatusBadge tone="warning">
                      Short {item.unallocatedUnits} units
                    </StatusBadge>
                  </span>
                ) : null}
              </TableCell>
              <TableCell numeric nowrap className="text-on-surface">
                {formatMwk(Number(item.unitPriceAtSale))}
              </TableCell>
              <TableCell numeric nowrap className="text-on-surface">
                {formatMwk(Number(item.subtotal))}
              </TableCell>
              <TableCell nowrap>
                {item.batch?.batchNumber ?? (item.unallocatedUnits > 0 ? "Unallocated" : "—")}
              </TableCell>
              <TableCell nowrap>
                {item.batch?.expiryDateKnown
                  ? new Date(item.batch.expiryDate).toLocaleDateString("en-MW", {
                      timeZone: "Africa/Blantyre",
                    })
                  : item.batch
                    ? "Not recorded"
                    : "—"}
              </TableCell>
            </TableRow>
          ))}
          {!sale.items.length ? (
            <TableRow>
              <TableCell colSpan={7} className="py-space-xl text-center">
                No line items.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </TableFrame>
    </div>
  );
}

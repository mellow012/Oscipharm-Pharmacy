import type { ReportsData } from "@/features/reports/types";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";

function money(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 2,
  }).format(amount);
}

function expiryTone(status: "Expired" | "Expiring soon" | "In date") {
  if (status === "Expired") return "danger";
  if (status === "Expiring soon") return "warning";
  return "success";
}

export function ReportsTables({ data }: { data: ReportsData }) {
  return (
    <div className="min-w-0 space-y-space-lg">
      <TableFrame
        ariaLabel="Daily sales totals and product mix"
        tableClassName="min-w-[760px]"
        header={
          <>
            <p className="font-eyebrow text-eyebrow uppercase text-secondary">Sales report</p>
            <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
              Daily totals and product mix
            </h2>
          </>
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Day</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Payment</TableHeaderCell>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell align="right">Gross item value</TableHeaderCell>
            <TableHeaderCell align="right">Sales</TableHeaderCell>
            <TableHeaderCell align="right">Lines</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {data.sales.length ? (
            data.sales.map((row) => (
              <TableRow key={`${row.day}-${row.paymentMethod}-${row.isRefund}-${row.product}`}>
                <TableCell nowrap>{row.day}</TableCell>
                <TableCell nowrap>{row.isRefund ? "Refund" : "Sale"}</TableCell>
                <TableCell nowrap>{row.paymentMethod}</TableCell>
                <TableCell className="min-w-48 text-on-surface">{row.product}</TableCell>
                <TableCell numeric nowrap className="text-on-surface">
                  {money(row.revenue)}
                </TableCell>
                <TableCell numeric nowrap className="text-on-surface">
                  {row.saleCount}
                </TableCell>
                <TableCell numeric nowrap className="text-on-surface">
                  {row.lineCount}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-space-lg text-left">
                No sales in this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableFrame>

      <section className="grid min-w-0 gap-space-lg lg:grid-cols-2">
        <TableFrame
          ariaLabel="Products below reorder point"
          tableClassName="min-w-[560px]"
          header={
            <>
              <p className="font-eyebrow text-eyebrow uppercase text-secondary">Low stock</p>
              <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
                Products below reorder point
              </h2>
            </>
          }
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Branch</TableHeaderCell>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell align="right">Available</TableHeaderCell>
              <TableHeaderCell align="right">Threshold</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {data.lowStock.length ? (
              data.lowStock.map((row) => (
                <TableRow key={`${row.branchId}-${row.ingredientName}-${row.brandName}`}>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell className="min-w-48 text-on-surface">
                    {row.ingredientName} · {row.brandName}
                  </TableCell>
                  <TableCell numeric nowrap className="text-on-surface">
                    {row.availableUnits}
                  </TableCell>
                  <TableCell numeric nowrap className="text-on-surface">
                    {row.reorderThreshold ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-space-lg text-left">
                  No low-stock products.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableFrame>

        <TableFrame
          ariaLabel="Expiring and expired stock"
          tableClassName="min-w-[680px]"
          header={
            <>
              <p className="font-eyebrow text-eyebrow uppercase text-secondary">Expiry watch</p>
              <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
                Expiring and expired stock
              </h2>
            </>
          }
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Branch</TableHeaderCell>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Batch</TableHeaderCell>
              <TableHeaderCell>Expiry</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {data.expiry.length ? (
              data.expiry.map((row) => (
                <TableRow key={`${row.branchName}-${row.batchNumber}-${row.expiryDate}`}>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell className="min-w-48 text-on-surface">
                    {row.ingredientName} · {row.brandName}
                  </TableCell>
                  <TableCell nowrap>{row.batchNumber ?? "—"}</TableCell>
                  <TableCell nowrap>
                    {new Date(row.expiryDate).toLocaleDateString("en-MW")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={expiryTone(row.status)}>{row.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-space-lg text-left">
                  No expiring or expired batches.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableFrame>
      </section>

      <section className="min-w-0 space-y-space-md">
        <header className="border-b border-outline-variant pb-space-sm">
          <p className="font-eyebrow text-eyebrow uppercase text-secondary">Expiry watch</p>
          <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
            Expiry not recorded{" "}
            <span className="font-body-sm text-body-sm tabular-nums text-on-surface-variant">
              {data.expiryNotRecorded.count}
            </span>
          </h2>
        </header>
        {data.expiryNotRecorded.count ? (
          data.expiryNotRecorded.groups.map((group) => (
            <TableFrame
              key={group.branchId}
              ariaLabel={`Expiry not recorded for ${group.branchName}`}
              tableClassName="min-w-[560px]"
              header={
                <h3 className="font-label-md text-label-md text-on-surface">
                  {group.branchName}{" "}
                  <span className="ml-space-xs font-body-sm text-body-sm tabular-nums text-on-surface-variant">
                    {group.batches.length} batches
                  </span>
                </h3>
              }
            >
              <TableHead>
                <tr>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell align="right">Remaining</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {group.batches.map((row) => (
                  <TableRow key={row.batchId}>
                    <TableCell className="min-w-48 text-on-surface">
                      {row.ingredientName} · {row.brandName}
                    </TableCell>
                    <TableCell nowrap>{row.batchNumber ?? "—"}</TableCell>
                    <TableCell numeric nowrap className="text-on-surface">
                      {row.remainingUnits}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableFrame>
          ))
        ) : (
          <NoticeBanner tone="info">All active batches have a recorded expiry date.</NoticeBanner>
        )}
      </section>

      <TableFrame
        ariaLabel="Recent audit actions"
        tableClassName="min-w-[900px]"
        header={
          <>
            <p className="font-eyebrow text-eyebrow uppercase text-secondary">Audit log</p>
            <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
              Recent actions
            </h2>
          </>
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell>When</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Branch</TableHeaderCell>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Sale</TableHeaderCell>
            <TableHeaderCell>Details</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {data.audit.length ? (
            data.audit.map((row) => (
              <TableRow key={`${row.createdAt}-${row.action}-${row.saleId ?? row.userName}`}>
                <TableCell nowrap>{new Date(row.createdAt).toLocaleString("en-MW")}</TableCell>
                <TableCell className="whitespace-nowrap text-on-surface">{row.action}</TableCell>
                <TableCell>{row.branchName ?? "Global"}</TableCell>
                <TableCell>{row.userName}</TableCell>
                <TableCell
                  nowrap
                  className="font-table-cell text-table-cell tabular-nums text-on-surface"
                >
                  {row.saleId ?? "—"}
                </TableCell>
                <TableCell className="min-w-64">
                  <AuditDetails value={row.details} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-space-lg text-left">
                No audit events in this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableFrame>
    </div>
  );
}

function AuditDetails({ value }: { value: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return <span>{String(parsed)}</span>;
  return (
    <dl className="space-y-space-xs">
      {Object.entries(parsed as Record<string, unknown>).map(([key, detail]) => (
        <div key={key}>
          <dt className="inline font-semibold text-on-surface">
            {key.replace(/([A-Z])/g, " $1")}:{" "}
          </dt>
          <dd className="inline break-words">
            {typeof detail === "object" && detail !== null
              ? JSON.stringify(detail)
              : String(detail)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

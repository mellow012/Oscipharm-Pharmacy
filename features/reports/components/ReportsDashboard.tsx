import type { ReportsData } from "@/features/reports/types";
import { ReportsTables } from "@/features/reports/components/ReportsTables";
import { SalesFreshnessBanner } from "@/features/reports/components/SalesFreshnessBanner";
import { SubmitButton } from "@/features/marketing/components/SubmitButton";
import { FilterToolbar } from "@/features/shared/components/FilterToolbar";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { StatCard } from "@/features/shared/components/StatCard";

function money(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ReportsDashboard({
  name,
  role,
  branchId,
  branches,
  data,
}: {
  name: string;
  role: "ADMIN" | "BRANCH_MANAGER";
  branchId: string | null;
  branches: { id: string; name: string; location: string | null }[];
  data: ReportsData;
}) {
  return (
    <div className="w-full min-w-0 space-y-space-lg py-space-lg">
      <SalesFreshnessBanner freshness={data.freshness} />
      <PageHeader
        eyebrow="Reports"
        title={`Insights for ${name}`}
        description="Malawi time is used for daily totals and expiry checks."
      />

      <FilterToolbar
        action="/reports"
        className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto]"
      >
        {role === "ADMIN" ? (
          <FormField id="reports-branch" label="Branch">
            {(fieldProps) => (
              <FormSelect {...fieldProps} name="branchId" defaultValue={branchId ?? "all"}>
                <option value="all">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </FormSelect>
            )}
          </FormField>
        ) : null}
        <FormField id="reports-from" label="From">
          {(fieldProps) => (
            <FormInput {...fieldProps} name="from" type="date" defaultValue={data.range.from} />
          )}
        </FormField>
        <FormField id="reports-to" label="To">
          {(fieldProps) => (
            <FormInput {...fieldProps} name="to" type="date" defaultValue={data.range.to} />
          )}
        </FormField>
        <SubmitButton className="min-h-[42px] self-end border border-primary bg-primary px-space-md font-label-md text-label-md text-on-primary hover:bg-primary-container">
          Apply
        </SubmitButton>
      </FilterToolbar>

      <section
        aria-label="Sales and membership totals"
        className="grid min-w-0 grid-cols-1 gap-px border border-outline-variant bg-outline-variant sm:grid-cols-2 lg:grid-cols-5"
      >
        <StatCard label="Gross sales" value={money(data.membershipSales.grossAmount)} />
        <StatCard
          label="Member discounts"
          value={`−${money(data.membershipSales.discountAmount)}`}
          tone="warning"
        />
        <StatCard
          label="Net revenue"
          value={money(data.membershipSales.combinedNetAmount)}
          tone="success"
        />
        <StatCard label="Refunds" value={money(data.membershipSales.refundAmount)} tone="danger" />
        <StatCard label="Member sales" value={data.membershipSales.memberSaleCount} />
      </section>

      <section
        aria-label="Discount breakdown by membership tier"
        className="grid min-w-0 gap-x-space-lg border-b border-outline-variant sm:grid-cols-2"
      >
        <div className="flex min-w-0 items-center justify-between gap-space-md border-t border-outline-variant py-space-md">
          <div>
            <h2 className="font-label-md text-label-md text-on-surface">Chronic illness · 20%</h2>
            <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
              {data.membershipSales.chronicSaleCount} member sales
            </p>
          </div>
          <p className="shrink-0 font-body-sm text-body-sm tabular-nums text-primary">
            −{money(data.membershipSales.chronicDiscountAmount)}
          </p>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-space-md border-t border-outline-variant py-space-md">
          <div>
            <h2 className="font-label-md text-label-md text-on-surface">General sickness · 15%</h2>
            <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
              {data.membershipSales.generalSaleCount} member sales
            </p>
          </div>
          <p className="shrink-0 font-body-sm text-body-sm tabular-nums text-primary">
            −{money(data.membershipSales.generalDiscountAmount)}
          </p>
        </div>
      </section>

      <ReportsTables data={data} />
    </div>
  );
}

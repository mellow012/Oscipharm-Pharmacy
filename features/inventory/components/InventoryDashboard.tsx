"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReceiveBatchForm } from "@/features/inventory/components/ReceiveBatchForm";
import { PricingForm } from "@/features/inventory/components/PricingForm";
import { BatchExpiryForm } from "@/features/inventory/components/BatchExpiryForm";
import { BatchQuantityAdjustment } from "@/features/inventory/components/BatchQuantityAdjustment";
import { SalesImportShortfalls } from "@/features/inventory/components/SalesImportShortfalls";
import { getExpiryStatus } from "@/features/inventory/utils/expiry";
import type { InventoryData } from "@/features/inventory/types";
import { pluralizeLabel } from "@/lib/plural";
import { FormField, FormSelect } from "@/features/shared/components/FormField";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { StatCard } from "@/features/shared/components/StatCard";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";

function expiryTone(label: string) {
  if (label === "Expired") return "danger";
  if (label === "Expiring soon") return "warning";
  if (label === "In date") return "success";
  return "neutral";
}

export function InventoryDashboard({
  name,
  role,
  branchId,
  branches,
  data,
  canReceive,
  canSetPrice,
  canAdjust,
}: {
  name: string;
  role: "ADMIN" | "BRANCH_MANAGER" | "POS";
  branchId: string;
  branches: Awaited<
    ReturnType<typeof import("@/features/inventory/lib/queries").getInventoryBranches>
  >;
  data: InventoryData;
  canReceive: boolean;
  canSetPrice: boolean;
  canAdjust: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const unitsOnHand = data.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
  const activeBatches = data.batches.filter((batch) => batch.quantityRemaining > 0);
  const negativeBatches = data.negativeBatches ?? [];

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1440px] space-y-space-lg overflow-x-clip px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <PageHeader
        eyebrow="Inventory workspace"
        title={`Keep stock moving, ${name}.`}
        description="Receive batches, watch expiry, and keep each branch price current."
        actions={
          role === "ADMIN" ? (
            <FormField id="inventory-working-branch" label="Working branch">
              {(fieldProps) => (
                <FormSelect
                  {...fieldProps}
                  value={branchId}
                  disabled={isPending}
                  onChange={(event) => {
                    const nextBranchId = event.target.value;
                    startTransition(() => router.push(`/inventory?branchId=${nextBranchId}`));
                  }}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </FormSelect>
              )}
            </FormField>
          ) : (
            <StatusBadge tone="neutral">{data.branch?.name ?? "Your branch"}</StatusBadge>
          )
        }
      />

      <section
        aria-label="Stock totals"
        className="grid min-w-0 grid-cols-1 gap-space-sm sm:grid-cols-2"
      >
        <StatCard label="Batches by expiry" value={activeBatches.length} supportingLine="active" />
        <StatCard
          label="Stock on hand"
          value={unitsOnHand}
          supportingLine="units, including stock with unrecorded expiry."
        />
      </section>

      {negativeBatches.length ? (
        <NoticeBanner tone="danger" title="Negative stock recorded">
          {negativeBatches.map((batch) => (
            <p key={batch.id}>
              {batch.variant.ingredient.name} · {batch.variant.brandName}: {batch.quantityRemaining} units
            </p>
          ))}
        </NoticeBanner>
      ) : null}

      <SalesImportShortfalls products={data.salesImportShortfalls} />

      <section className="grid min-w-0 grid-cols-1 gap-space-lg min-[1200px]:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="min-w-0">
          {data.batches.length ? (
            <TableFrame
              ariaLabel="Batches by expiry"
              tableClassName={canAdjust ? "min-w-[920px]" : "min-w-[760px]"}
              header={
                <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
                  <div>
                    <p className="font-eyebrow text-eyebrow uppercase text-secondary">
                      Stock on hand
                    </p>
                    <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
                      Batches by expiry
                    </h2>
                  </div>
                  <span className="font-table-header text-table-header tabular-nums text-on-surface-variant">
                    {activeBatches.length} active
                  </span>
                </div>
              }
            >
              <TableHead>
                <tr>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell align="right">Remaining</TableHeaderCell>
                  <TableHeaderCell>Expiry</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {canAdjust ? <TableHeaderCell>Adjust</TableHeaderCell> : null}
                </tr>
              </TableHead>
              <TableBody>
                {data.batches.map((batch) => {
                  const status = getExpiryStatus(new Date(batch.expiryDate), batch.expiryDateKnown);
                  return (
                    <TableRow key={batch.id} className={status.rowClassName}>
                      <TableCell className="min-w-48 text-on-surface">
                        <p className="font-label-md text-label-md text-on-surface">
                          {batch.variant.ingredient.name} · {batch.variant.brandName}
                        </p>
                        <p className="mt-space-xs text-on-surface-variant">
                          {batch.variant.strength ?? "Standard strength"}
                        </p>
                      </TableCell>
                      <TableCell nowrap>{batch.batchNumber ?? "No number"}</TableCell>
                      <TableCell numeric nowrap className="text-on-surface">
                        {batch.quantityRemaining}{" "}
                        {pluralizeLabel(batch.quantityRemaining, batch.variant.unitLabel)}
                      </TableCell>
                      <TableCell nowrap>
                        <p>
                          {batch.expiryDateKnown
                            ? new Date(batch.expiryDate).toLocaleDateString("en-MW")
                            : "Not recorded"}
                        </p>
                        {canAdjust ? (
                          <BatchExpiryForm batchId={batch.id} expiryDate={batch.expiryDate} />
                        ) : null}
                      </TableCell>
                      <TableCell nowrap>
                        <StatusBadge tone={expiryTone(status.label)}>{status.label}</StatusBadge>
                      </TableCell>
                      {canAdjust ? (
                        <TableCell nowrap>
                          <BatchQuantityAdjustment
                            batchId={batch.id}
                            batchNumber={batch.batchNumber}
                            productName={`${batch.variant.ingredient.name} · ${batch.variant.brandName} ${batch.variant.strength ?? ""}`.trim()}
                            currentUnits={batch.quantityRemaining}
                            packSize={batch.variant.packSize}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </TableFrame>
          ) : (
            <p className="border border-dashed border-outline-variant px-space-lg py-space-xl text-on-surface-variant">
              No stock remains at this branch.
            </p>
          )}
        </div>

        {canReceive ? (
          <div className="min-w-0 min-[1200px]:sticky min-[1200px]:top-20 min-[1200px]:self-start">
            <ReceiveBatchForm
              variants={data.variants}
              branchId={branchId}
              includeBranchId={role === "ADMIN"}
            />
          </div>
        ) : null}
      </section>

      <section className="min-w-0 border-t border-outline-variant pt-space-lg">
        <div className="mb-space-md flex min-w-0 flex-col gap-space-sm border-b border-outline-variant pb-space-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-eyebrow text-eyebrow uppercase text-secondary">Branch pricing</p>
            <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
              Prices and reorder points
            </h2>
          </div>
          <p className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">
            Unit prices are not applicable when a product is sold by pack only.
          </p>
        </div>
        {canSetPrice ? (
          <div className="grid min-w-0 gap-space-md md:grid-cols-2 2xl:grid-cols-3">
            {data.variants.map((variant) => (
              <PricingForm
                key={variant.id}
                variant={variant}
                branchId={branchId}
                includeBranchId={role === "ADMIN"}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

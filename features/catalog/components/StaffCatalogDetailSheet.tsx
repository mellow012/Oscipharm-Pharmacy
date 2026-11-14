"use client";

import { useEffect, useRef, useState } from "react";
import { pluralizeLabel } from "@/lib/plural";
import { StaffVariantForm } from "@/features/catalog/components/StaffVariantForm";
import { StaffCatalogLinks } from "@/features/catalog/components/StaffCatalogLinks";
import type { StaffCatalogCategory } from "@/features/catalog/types";
import { StatCard } from "@/features/shared/components/StatCard";
import { StatusBadge } from "@/features/shared/components/StatusBadge";

function formatCurrency(value: string | null) {
  if (!value) return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `MK ${numeric.toLocaleString("en-MW")}` : value;
}

export function StaffCatalogDetailSheet({
  variant,
  branchId,
  categories,
  canManage,
  onSaved,
  onClose,
}: {
  variant: {
    id: string;
    categoryId: string | null;
    ingredientId: string | null;
    brandName: string;
    strength: string | null;
    packSize: number;
    unitLabel: string;
    allowsLooseSale: boolean;
    isActive: boolean;
    pricePerPack: string | null;
    pricePerUnit: string | null;
    stock: number;
    aroniumProductLinks: Array<{ id: string; aroniumCode: string; mode: "PACK" | "UNIT" }>;
  } | null;
  branchId: string;
  categories: StaffCatalogCategory[];
  canManage: boolean;
  onSaved: (variantId: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(!variant && canManage);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (firstFocusable ?? panelRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, []);

  const title = editing
    ? variant
      ? "Edit variant"
      : "Add variant"
    : (variant?.brandName ?? "Catalog item");

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/40 p-0 sm:p-space-md" role="presentation">
      <div className="flex h-full items-end justify-end sm:items-center">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="variant-detail-title"
          aria-describedby={variant && !editing ? "variant-detail-description" : undefined}
          className="flex h-[92vh] w-full flex-col overflow-y-auto border border-outline-variant bg-surface-container-lowest p-space-md shadow-modal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-auto sm:max-h-[90vh] sm:w-[560px] sm:p-space-lg"
        >
          <div className="mb-space-md flex items-start justify-between gap-space-md border-b border-outline-variant pb-space-md">
            <div className="min-w-0">
              <p className="font-eyebrow text-eyebrow uppercase text-secondary">Staff catalog</p>
              <h2
                id="variant-detail-title"
                className="mt-space-xs break-words font-headline-md text-headline-md text-primary"
              >
                {title}
              </h2>
              {!editing && variant ? (
                <p
                  id="variant-detail-description"
                  className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant"
                >
                  {variant.strength ?? "Standard strength"}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 shrink-0 border border-outline-variant px-space-sm font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Close
            </button>
          </div>

          {editing && canManage ? (
            <StaffVariantForm
              categories={categories}
              branchId={branchId}
              variant={variant}
              onCancel={() => (variant ? setEditing(false) : onClose())}
              onSaved={(variantId) => {
                setEditing(false);
                onSaved(variantId);
              }}
            />
          ) : variant ? (
            <>
              <div className="mb-space-md flex justify-end">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="min-h-11 border border-primary px-space-md font-label-sm text-label-sm text-primary hover:bg-primary hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <StaffCatalogLinks variant={variant} branchId={branchId} canManage={canManage} />
              <div className="grid min-w-0 grid-cols-1 gap-space-sm sm:grid-cols-2">
                <StatCard
                  label="Pack size"
                  value={`${variant.packSize} ${pluralizeLabel(variant.packSize, variant.unitLabel)}`}
                />
                <div className="border-l-2 border-outline-variant bg-surface-container-lowest px-space-md py-space-md">
                  <p className="font-table-header text-table-header uppercase text-on-surface-variant">
                    Status
                  </p>
                  <div className="mt-space-md">
                    <StatusBadge tone={variant.isActive ? "success" : "danger"}>
                      {variant.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                </div>
                <StatCard label="Pack price" value={formatCurrency(variant.pricePerPack)} />
                <StatCard
                  label="Unit price"
                  value={
                    variant.allowsLooseSale ? formatCurrency(variant.pricePerUnit) : "Pack only"
                  }
                />
              </div>
              <div className="mt-space-sm border-l-2 border-primary bg-surface-container-low px-space-md py-space-md">
                <p className="font-table-header text-table-header uppercase text-on-surface-variant">
                  Total stock
                </p>
                <p className="mt-space-xs font-headline-sm text-headline-sm tabular-nums text-primary">
                  {variant.stock} units
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

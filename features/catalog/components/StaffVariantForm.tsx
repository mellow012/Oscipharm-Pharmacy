"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { variantInputSchema } from "@/features/catalog/lib/variant-validation";
import {
  saveStaffVariant,
  type StaffVariantActionState,
} from "@/features/catalog/lib/variant-actions";
import type { StaffCatalogCategory } from "@/features/catalog/types";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { StaffVariantFields } from "@/features/catalog/components/StaffVariantFields";

const initialState: StaffVariantActionState = {};

type EditableVariant = {
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
};

export function StaffVariantForm({
  categories,
  branchId,
  variant,
  onCancel,
  onSaved,
}: {
  categories: StaffCatalogCategory[];
  branchId: string;
  variant: EditableVariant | null;
  onCancel: () => void;
  onSaved: (variantId: string) => void;
}) {
  const [state, formAction, pending] = useActionState(saveStaffVariant, initialState);
  const [categoryMode, setCategoryMode] = useState(variant?.categoryId ? "existing" : "none");
  const [categoryId, setCategoryId] = useState(variant?.categoryId ?? "");
  const [categoryName, setCategoryName] = useState("");
  const [ingredientMode, setIngredientMode] = useState(variant?.ingredientId ? "existing" : "none");
  const [ingredientId, setIngredientId] = useState(variant?.ingredientId ?? "");
  const [ingredientName, setIngredientName] = useState("");
  const [allowsLooseSale, setAllowsLooseSale] = useState(variant?.allowsLooseSale ?? false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const [submitAfterConfirmation, setSubmitAfterConfirmation] = useState(false);
  const handledSaveId = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const deactivationConfirmed = useRef(false);

  useEffect(() => {
    if (state.variantId && handledSaveId.current !== state.variantId) {
      handledSaveId.current = state.variantId;
      onSaved(state.variantId);
    }
  }, [onSaved, state.variantId]);

  useEffect(() => {
    if (!submitAfterConfirmation) return;
    setSubmitAfterConfirmation(false);
    formRef.current?.requestSubmit();
  }, [submitAfterConfirmation]);

  const validateBeforeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const parsed = variantInputSchema.safeParse(Object.fromEntries(formData.entries()));
    if (parsed.success) {
      setClientErrors({});
      if (
        variant?.isActive &&
        formData.get("isActive") !== "on" &&
        !deactivationConfirmed.current
      ) {
        event.preventDefault();
        setConfirmingDeactivation(true);
        return;
      }
      deactivationConfirmed.current = false;
      return;
    }
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? "form");
      if (!nextErrors[key]) nextErrors[key] = issue.message;
    });
    setClientErrors(nextErrors);
  };

  const errorFor = (field: string) =>
    clientErrors[field] ??
    state.errors?.[field as keyof NonNullable<StaffVariantActionState["errors"]>];

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={validateBeforeSubmit}
      className="space-y-space-md"
    >
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="variantId" value={variant?.id ?? ""} />
      <input type="hidden" name="categoryMode" value={categoryMode} />
      <input
        type="hidden"
        name="categoryId"
        value={categoryMode === "existing" ? categoryId : ""}
      />
      <input type="hidden" name="ingredientMode" value={ingredientMode} />
      <input
        type="hidden"
        name="ingredientId"
        value={ingredientMode === "existing" ? ingredientId : ""}
      />

      <StaffVariantFields
        categories={categories}
        variant={variant}
        categoryMode={categoryMode}
        setCategoryMode={setCategoryMode}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        ingredientMode={ingredientMode}
        setIngredientMode={setIngredientMode}
        ingredientId={ingredientId}
        setIngredientId={setIngredientId}
        ingredientName={ingredientName}
        setIngredientName={setIngredientName}
        allowsLooseSale={allowsLooseSale}
        setAllowsLooseSale={setAllowsLooseSale}
        errorFor={errorFor}
      />

      {errorFor("form") ? <NoticeBanner tone="danger">{errorFor("form")}</NoticeBanner> : null}
      <div className="flex justify-end gap-space-sm">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 border border-outline-variant px-space-md font-label-md text-label-md text-on-surface-variant"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 border border-primary bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-60"
        >
          {pending ? "Saving..." : variant ? "Save changes" : "Add variant"}
        </button>
      </div>
      <ConfirmDialog
        open={confirmingDeactivation}
        onOpenChange={setConfirmingDeactivation}
        title="Deactivate this variant?"
        description="This variant will no longer be active in the catalog."
        confirmLabel="Deactivate variant"
        destructive
        onConfirm={() => {
          deactivationConfirmed.current = true;
          setSubmitAfterConfirmation(true);
        }}
      />
    </form>
  );
}

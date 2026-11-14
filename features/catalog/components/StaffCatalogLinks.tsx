"use client";

import { useRef } from "react";
import { useActionState } from "react";
import {
  createAroniumProductLink,
  deleteAroniumProductLink,
} from "@/features/catalog/lib/aronium-actions";
import { pluralizeLabel } from "@/lib/plural";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

type LinkActionState = { error?: string; success?: string };
const initialState: LinkActionState = {};

function AroniumForm({
  variantId,
  allowsLooseSale,
  branchId,
}: {
  variantId: string;
  allowsLooseSale: boolean;
  branchId: string;
}) {
  const [state, formAction, pending] = useActionState(createAroniumProductLink, initialState);

  return (
    <form
      action={formAction}
      className="mt-space-md border border-outline-variant bg-surface-container-low p-space-md"
    >
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="branchId" value={branchId} />
      <div className="grid min-w-0 gap-space-md sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
        <FormField id={`aronium-code-${variantId}`} label="Aronium code" required>
          {(fieldProps) => (
            <FormInput {...fieldProps} name="aroniumCode" placeholder="e.g. 3" maxLength={100} />
          )}
        </FormField>
        <FormField id={`aronium-mode-${variantId}`} label="Mode" required>
          {(fieldProps) => (
            <FormSelect {...fieldProps} name="mode" defaultValue="PACK">
              <option value="PACK">PACK</option>
              {allowsLooseSale ? <option value="UNIT">UNIT</option> : null}
            </FormSelect>
          )}
        </FormField>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 border border-primary px-space-md font-label-sm text-label-sm text-primary hover:bg-primary hover:text-on-primary disabled:opacity-60"
        >
          {pending ? "Saving..." : "Add code"}
        </button>
      </div>
      {state.error ? (
        <NoticeBanner tone="danger" className="mt-space-sm">
          {state.error}
        </NoticeBanner>
      ) : null}
      {state.success ? (
        <NoticeBanner tone="info" className="mt-space-sm">
          {state.success}
        </NoticeBanner>
      ) : null}
    </form>
  );
}

function DeleteAroniumForm({ linkId, branchId }: { linkId: string; branchId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteAroniumProductLink, initialState);

  return (
    <>
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="linkId" value={linkId} />
        <input type="hidden" name="branchId" value={branchId} />
      </form>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={pending}
            className="min-h-11 px-space-xs font-label-sm text-label-sm text-status-danger-text underline underline-offset-2"
          >
            {pending ? "Removing..." : "Remove"}
          </button>
        }
        title="Remove Aronium code?"
        description="This removes the product link for the selected branch."
        confirmLabel="Remove code"
        destructive
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      {state.error ? (
        <span role="alert" className="font-body-sm text-body-sm text-status-danger-text">
          {state.error}
        </span>
      ) : null}
      {state.success ? (
        <span role="status" className="font-body-sm text-body-sm text-status-success">
          {state.success}
        </span>
      ) : null}
    </>
  );
}

export function StaffCatalogLinks({
  variant,
  branchId,
  canManage,
}: {
  variant: {
    id: string;
    allowsLooseSale: boolean;
    aroniumProductLinks: Array<{ id: string; aroniumCode: string; mode: "PACK" | "UNIT" }>;
  };
  branchId: string;
  canManage: boolean;
}) {
  return (
    <section className="mt-space-lg border-t border-outline-variant pt-space-md">
      <div className="mb-space-sm flex flex-wrap items-baseline justify-between gap-space-sm">
        <h4 className="font-table-header text-table-header uppercase text-on-surface-variant">
          Aronium codes
        </h4>
        <span className="font-body-sm text-body-sm tabular-nums text-on-surface-variant">
          {variant.aroniumProductLinks.length}{" "}
          {pluralizeLabel(variant.aroniumProductLinks.length, "code")} linked
        </span>
      </div>
      {variant.aroniumProductLinks.length > 0 ? (
        <ul className="divide-y divide-outline-variant border-y border-outline-variant">
          {variant.aroniumProductLinks.map((link) => (
            <li
              key={link.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-space-sm py-space-sm"
            >
              <span className="min-w-0 font-body-sm text-body-sm">
                <span className="font-table-cell text-table-cell tabular-nums text-on-surface">
                  {link.aroniumCode}
                </span>
                <span className="ml-space-sm text-on-surface-variant">({link.mode})</span>
              </span>
              {canManage ? <DeleteAroniumForm linkId={link.id} branchId={branchId} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No Aronium codes linked yet.
        </p>
      )}
      {canManage ? (
        <AroniumForm
          variantId={variant.id}
          allowsLooseSale={variant.allowsLooseSale}
          branchId={branchId}
        />
      ) : null}
    </section>
  );
}

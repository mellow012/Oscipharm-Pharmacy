"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveBranchAction, deleteBranchAction, restoreBranchAction } from "@/features/admin/lib/branch-actions";
import { archiveStaffAccount, restoreStaffAccount } from "@/features/admin/lib/staff-actions";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";

type Result = { ok: boolean; message: string } | null;

export function BranchDeleteControl({ branchId, branchName }: { branchId: string; branchName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [typedName, setTypedName] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function confirmDelete() {
        setBusy(true);
        setMessage("");
        const result = await deleteBranchAction(branchId);
        setBusy(false);
        setMessage(result?.message ?? "The branch could not be deleted.");
        setOpen(false);
        setTypedName("");
        if (result?.ok) router.refresh();
    }

    return (
        <div className="w-full sm:w-auto">
            <ConfirmDialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) setTypedName("");
                }}
                trigger={<button type="button" className="w-full border border-danger px-3 py-2 text-sm text-danger hover:bg-danger-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger sm:w-auto">Delete</button>}
                title={`Delete ${branchName}?`}
                description="This permanently deletes the branch record. Its lifecycle audit history will be kept with the branch name. Staff, invitations, stock, prices, sales, imports, or other audit history block deletion."
                confirmLabel={busy ? "Deleting..." : "Delete branch"}
                destructive
                confirmDisabled={busy}
                confirmationText={{ expected: branchName, value: typedName, onChange: setTypedName }}
                onConfirm={() => void confirmDelete()}
            />
            {message ? <p role="status" className="mt-2 text-xs text-muted">{message}</p> : null}
        </div>
    );
}

export function ArchiveControl({
    kind,
    id,
    name,
    archived,
    canArchive,
}: {
    kind: "branch" | "staff";
    id: string;
    name: string;
    archived: boolean;
    canArchive: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const label = kind === "branch" ? "branch" : "staff account";

    async function run(action: () => Promise<Result>) {
        setBusy(true);
        setMessage("");
        const result = await action();
        setBusy(false);
        setMessage(result?.message ?? "The update could not be completed.");
        setOpen(false);
        if (result?.ok) router.refresh();
    }

    return (
        <div className="w-full sm:w-auto">
            {archived ? (
                <button type="button" disabled={busy} onClick={() => void run(() => kind === "branch" ? restoreBranchAction(id) : restoreStaffAccount(id))} className="w-full border border-primary px-3 py-2 text-sm text-primary hover:bg-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 sm:w-auto">{busy ? "Restoring..." : "Restore"}</button>
            ) : canArchive ? (
                <ConfirmDialog
                    open={open}
                    onOpenChange={setOpen}
                    trigger={<button type="button" className="w-full border border-border px-3 py-2 text-sm text-muted hover:bg-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto">Archive</button>}
                    title={`Archive ${name}?`}
                    description="This item will be hidden from lists. Its history is kept, and you can restore it later."
                    confirmLabel={busy ? "Archiving..." : `Archive ${label}`}
                    confirmDisabled={busy}
                    onConfirm={() => void run(() => kind === "branch" ? archiveBranchAction(id) : archiveStaffAccount(id))}
                />
            ) : null}
            {message ? <p role="status" className="mt-2 text-xs text-muted">{message}</p> : null}
        </div>
    );
}

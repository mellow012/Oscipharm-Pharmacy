"use client";

import { useActionState } from "react";
import Link from "next/link";
import { InPlaceFilter } from "@/features/shared/components/InPlaceFilter";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { ArchiveControl, BranchDeleteControl } from "@/features/admin/components/ArchiveControls";
import { SubmitButton } from "@/features/marketing/components/SubmitButton";
import {
    createBranchAction,
    deactivateBranchAction,
    reactivateBranchAction,
    updateBranchAction,
} from "@/features/admin/lib/branch-actions";

type BranchRow = {
    id: string;
    name: string;
    location: string | null;
    contactNumber: string | null;
    isActive: boolean;
    archivedAt: Date | null;
    _count: { users: number; batches: number };
};

type ActionState = { ok: boolean; message: string } | null;
const initialState: ActionState = null;

export function BranchManagement({ branches, showHeader = true, status = "active", statusCounts, preservedParams = {} }: {
    branches: BranchRow[];
    showHeader?: boolean;
    status?: "active" | "inactive" | "all" | "archived";
    statusCounts?: { active: number; inactive: number; all: number; archived: number };
    preservedParams?: Record<string, string | string[] | undefined>;
}) {
    if (!showHeader) {
        return (
            <section aria-labelledby="create-branch-heading" className="space-y-6">
                <div className="border border-border bg-surface p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                        <h2 id="create-branch-heading" className="text-xl text-ink sm:text-2xl">Create branch</h2>
                        <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">{branches.length} total</span>
                    </div>
                    <CreateBranchForm />
                </div>

                <div className="border border-border bg-surface p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                        <h2 className="text-xl text-ink sm:text-2xl">Branch locations</h2>
                        <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">{branches.length} total</span>
                    </div>
                    {statusCounts ? <div className="mb-4">
                        <InPlaceFilter
                            name="status"
                            label="Status"
                            value={status}
                            preservedParams={preservedParams}
                            options={[
                                { value: "active", label: `Active ${statusCounts.active}` },
                                { value: "inactive", label: `Inactive ${statusCounts.inactive}` },
                                { value: "all", label: `All ${statusCounts.all}` },
                                { value: "archived", label: `Archived ${statusCounts.archived}` },
                            ]}
                        />
                    </div> : null}

                    {branches.length ? (
                        <ul className="divide-y divide-border">
                            {branches.map((branch) => <BranchListItem key={branch.id} branch={branch} />)}
                        </ul>
                    ) : <p className="py-8 text-sm text-muted">No branches yet.</p>}
                </div>
            </section>
        );
    }

    return (
        <div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <header className="border-b border-border py-8">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Admin workspace</p>
                <h1 className="mt-2 text-4xl text-ink">Branches</h1>
                <p className="mt-2 text-sm text-muted">Create and manage pharmacy locations.</p>
            </header>

            <section aria-labelledby="create-branch-heading" className="border-b border-border py-7">
                <h2 id="create-branch-heading" className="mb-4 text-2xl text-ink">Create branch</h2>
                <CreateBranchForm />
            </section>

            <section aria-labelledby="branch-list-heading" className="py-7">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                    <h2 id="branch-list-heading" className="text-2xl text-ink">All branches</h2>
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{branches.length} total</span>
                </div>
                {statusCounts ? <div className="mb-4">
                    <InPlaceFilter
                        name="status"
                        label="Status"
                        value={status}
                        preservedParams={preservedParams}
                        options={[
                            { value: "active", label: `Active ${statusCounts.active}` },
                            { value: "inactive", label: `Inactive ${statusCounts.inactive}` },
                            { value: "all", label: `All ${statusCounts.all}` },
                            { value: "archived", label: `Archived ${statusCounts.archived}` },
                        ]}
                    />
                </div> : null}
                {branches.length ? (
                    <ul className="divide-y divide-border">
                        {branches.map((branch) => <BranchListItem key={branch.id} branch={branch} />)}
                    </ul>
                ) : <p className="py-8 text-sm text-muted">No branches yet.</p>}
            </section>
        </div>
    );
}

function CreateBranchForm() {
    const [state, formAction] = useActionState(createBranchAction, initialState);

    return (
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
            <FormField id="create-branch-name" label="Branch name" required>
                {(fieldProps) => <FormInput {...fieldProps} name="name" type="text" maxLength={120} />}
            </FormField>
            <FormField id="create-branch-location" label="Location" required>
                {(fieldProps) => <FormInput {...fieldProps} name="location" type="text" maxLength={240} />}
            </FormField>
            <FormField id="create-branch-contact" label="Contact number" helperText="Optional">
                {(fieldProps) => <FormInput {...fieldProps} name="contactNumber" type="tel" maxLength={20} autoComplete="tel" />}
            </FormField>
            <ActionMessage state={state} />
            <div className="sm:col-span-2">
                <SubmitButton className="border border-primary bg-primary px-4 py-2 font-medium text-primary-fg">Create branch</SubmitButton>
            </div>
        </form>
    );
}

function BranchListItem({ branch }: { branch: BranchRow }) {
    return (
        <li className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <h3 className="break-words text-lg font-semibold text-ink">{branch.name}</h3>
                    {branch.archivedAt ? <StatusBadge>Archived</StatusBadge> : <StatusBadge tone={branch.isActive ? "success" : "neutral"}>{branch.isActive ? "Active" : "Inactive"}</StatusBadge>}
                </div>
                <Link href={`/admin/staff?branchId=${encodeURIComponent(branch.id)}`} className="group/link inline-block rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <p className="mt-1 break-words text-sm text-muted">{branch.location}</p>
                    <span className="mt-2 inline-block text-xs text-primary group-hover/link:underline">View assigned staff</span>
                </Link>
                {branch.contactNumber ? (
                    <a href={`tel:${branch.contactNumber.replace(/[^\d+]/g, "")}`} className="mt-1 inline-block rounded-sm text-sm text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        {branch.contactNumber}
                    </a>
                ) : <p className="mt-1 text-sm text-muted">No contact number</p>}
                <p className="mt-2 font-mono text-xs text-muted">{branch._count.users} staff · {branch._count.batches} batches</p>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
                <EditBranchForm branch={branch} />
                {!branch.archivedAt ? <BranchStatusForm branch={branch} /> : null}
                <ArchiveControl kind="branch" id={branch.id} name={branch.name} archived={Boolean(branch.archivedAt)} canArchive={!branch.isActive && !branch.archivedAt} />
                <BranchDeleteControl branchId={branch.id} branchName={branch.name} />
            </div>
        </li>
    );
}

function EditBranchForm({ branch }: { branch: BranchRow }) {
    const [state, formAction] = useActionState(updateBranchAction, initialState);

    return (
        <details className="w-full sm:w-auto">
            <summary className="min-h-10 cursor-pointer border border-border px-3 py-2 text-center text-sm text-ink hover:bg-chip sm:w-24">Edit</summary>
            <form action={formAction} className="mt-3 grid gap-3 border border-border bg-surface p-4 sm:min-w-80">
                <input type="hidden" name="branchId" value={branch.id} />
                <FormField id={`edit-branch-name-${branch.id}`} label="Branch name" required>
                    {(fieldProps) => <FormInput {...fieldProps} name="name" type="text" maxLength={120} defaultValue={branch.name} />}
                </FormField>
                <FormField id={`edit-branch-location-${branch.id}`} label="Location" required>
                    {(fieldProps) => <FormInput {...fieldProps} name="location" type="text" maxLength={240} defaultValue={branch.location ?? ""} />}
                </FormField>
                <FormField id={`edit-branch-contact-${branch.id}`} label="Contact number" helperText="Optional">
                    {(fieldProps) => <FormInput {...fieldProps} name="contactNumber" type="tel" maxLength={20} autoComplete="tel" defaultValue={branch.contactNumber ?? ""} />}
                </FormField>
                <ActionMessage state={state} />
                <SubmitButton className="w-fit border border-primary px-4 py-2 text-sm font-medium text-primary">Save changes</SubmitButton>
            </form>
        </details>
    );
}

function BranchStatusForm({ branch }: { branch: BranchRow }) {
    const action = branch.isActive ? deactivateBranchAction : reactivateBranchAction;
    const [state, formAction] = useActionState(action, initialState);

    return (
        <div className="w-full sm:w-auto">
            <form action={formAction}>
                <input type="hidden" name="branchId" value={branch.id} />
                <SubmitButton className={`w-full border px-3 py-2 text-sm font-medium sm:w-auto ${branch.isActive ? "border-danger text-danger hover:bg-danger-bg" : "border-primary text-primary hover:bg-chip"}`}>
                    {branch.isActive ? "Deactivate" : "Reactivate"}
                </SubmitButton>
            </form>
            <ActionMessage state={state} />
        </div>
    );
}

function ActionMessage({ state }: { state: ActionState }) {
    if (!state?.message) return null;
    return <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-primary" : "text-danger"}`}>{state.message}</p>;
}
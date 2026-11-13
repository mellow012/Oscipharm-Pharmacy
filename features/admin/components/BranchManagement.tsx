"use client";

import { useActionState } from "react";
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
    isActive: boolean;
    _count: { users: number; batches: number };
};

type ActionState = { ok: boolean; message: string } | null;
const initialState: ActionState = null;

export function BranchManagement({ branches }: { branches: BranchRow[] }) {
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
            <label className="text-sm text-muted">
                Branch name
                <input name="name" type="text" maxLength={120} required className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" />
            </label>
            <label className="text-sm text-muted">
                Location
                <input name="location" type="text" maxLength={240} required className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" />
            </label>
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
                    <span className={`border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.1em] ${branch.isActive ? "border-primary text-primary" : "border-border text-muted"}`}>
                        {branch.isActive ? "Active" : "Inactive"}
                    </span>
                </div>
                <p className="mt-1 break-words text-sm text-muted">{branch.location}</p>
                <p className="mt-2 font-mono text-xs text-muted">{branch._count.users} staff · {branch._count.batches} batches</p>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
                <EditBranchForm branch={branch} />
                <BranchStatusForm branch={branch} />
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
                <label className="text-sm text-muted">
                    Branch name
                    <input name="name" type="text" maxLength={120} required defaultValue={branch.name} className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" />
                </label>
                <label className="text-sm text-muted">
                    Location
                    <input name="location" type="text" maxLength={240} required defaultValue={branch.location ?? ""} className="mt-1 block w-full border border-border bg-white px-3 py-2 text-ink" />
                </label>
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
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReceiveBatchForm } from "@/features/inventory/components/ReceiveBatchForm";
import { PricingForm } from "@/features/inventory/components/PricingForm";
import { EXPIRY_WARNING_DAYS } from "@/features/inventory/types";
import type { InventoryData } from "@/features/inventory/types";

function expiryStatus(expiryDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);
    if (expiryDate < today) return { label: "Expired", className: "text-danger", rowClassName: "bg-danger-bg/40" };
    if (expiryDate <= warningDate) return { label: "Expiring soon", className: "text-warn", rowClassName: "bg-warn-bg/45" };
    return { label: "In date", className: "text-primary", rowClassName: "" };
}

export function InventoryDashboard({ name, role, branchId, branches, data }: { name: string; role: "ADMIN" | "BRANCH_MANAGER"; branchId: string; branches: Awaited<ReturnType<typeof import("@/features/inventory/lib/queries").getInventoryBranches>>; data: InventoryData }) {
    const router = useRouter();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <nav className="flex items-center justify-between border-b border-border pb-5">
                <Link href="/staff" className="font-mono text-xs uppercase tracking-[0.14em] text-warn">OsciPharm staff</Link>
                <Link href="/catalog" className="text-sm text-muted transition hover:text-primary">View catalog</Link>
            </nav>
            <header className="flex flex-col gap-6 border-b border-border py-10 sm:flex-row sm:items-end sm:justify-between sm:py-14">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">Inventory workspace</p>
                    <h1 className="text-5xl leading-[0.98] text-ink">Keep stock moving, {name}.</h1>
                    <p className="mt-3 max-w-xl text-lg text-muted">Receive batches, watch expiry, and keep each branch price current.</p>
                </div>
                {role === "ADMIN" ? (
                    <label className="block min-w-64 text-sm text-muted">
                        Working branch
                        <select value={branchId} onChange={(event) => router.push(`/inventory?branchId=${event.target.value}`)} className="mt-2 w-full border border-border bg-surface px-3 py-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </select>
                    </label>
                ) : <span className="border border-primary bg-chip px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-primary">{data.branch?.name ?? "Your branch"}</span>}
            </header>

            <section className="grid gap-8 py-10 lg:grid-cols-[1.35fr_0.65fr]">
                <div>
                    <div className="mb-5 flex items-end justify-between border-b border-border pb-3">
                        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Stock on hand</p><h2 className="mt-2 text-3xl text-ink">Batches by expiry</h2></div>
                        <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{data.batches.length} active</span>
                    </div>
                    {data.batches.length ? <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[620px] text-left"><thead className="border-b border-border font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted"><tr><th className="px-4 py-3 font-normal">Product</th><th className="px-4 py-3 font-normal">Batch</th><th className="px-4 py-3 font-normal">Remaining</th><th className="px-4 py-3 font-normal">Expiry</th><th className="px-4 py-3 font-normal">Status</th></tr></thead><tbody className="divide-y divide-border">{data.batches.map((batch) => { const status = expiryStatus(new Date(batch.expiryDate)); return <tr key={batch.id} className={status.rowClassName}><td className="px-4 py-4"><p className="font-medium text-ink">{batch.variant.ingredient.name} · {batch.variant.brandName}</p><p className="text-sm text-muted">{batch.variant.strength ?? "Standard strength"}</p></td><td className="px-4 py-4 text-sm text-muted">{batch.batchNumber ?? "No number"}</td><td className="px-4 py-4 font-mono text-sm text-ink">{batch.quantityRemaining} {batch.variant.unitLabel}s</td><td className="px-4 py-4 text-sm text-muted">{new Date(batch.expiryDate).toLocaleDateString("en-MW")}</td><td className={`px-4 py-4 font-mono text-[0.65rem] uppercase tracking-[0.1em] ${status.className}`}>{status.label}</td></tr>; })}</tbody></table></div> : <p className="border border-dashed border-border px-5 py-10 text-muted">No stock remains at this branch.</p>}
                </div>
                <ReceiveBatchForm variants={data.variants} branchId={branchId} includeBranchId={role === "ADMIN"} />
            </section>

            <section className="border-t border-border py-10">
                <div className="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Branch pricing</p><h2 className="mt-2 text-3xl text-ink">Prices and reorder points</h2></div><p className="max-w-sm text-sm text-muted">Unit prices are not applicable when a product is sold by pack only.</p></div>
                <div className="border-y border-border">{data.variants.map((variant) => <PricingForm key={variant.id} variant={variant} branchId={branchId} includeBranchId={role === "ADMIN"} />)}</div>
            </section>
        </main>
    );
}
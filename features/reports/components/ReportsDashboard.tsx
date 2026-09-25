import Link from "next/link";
import type { ReportsData } from "@/features/reports/types";

function money(value: string | number) {
    const amount = typeof value === "string" ? Number(value) : value;
    return new Intl.NumberFormat("en-MW", { style: "currency", currency: "MWK", maximumFractionDigits: 2 }).format(amount);
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
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <nav className="flex items-center justify-between border-b border-border pb-5">
                <Link href="/staff" className="font-mono text-xs uppercase tracking-[0.14em] text-warn">OsciPharm staff</Link>
                <Link href="/inventory" className="text-sm text-muted transition hover:text-primary">Inventory</Link>
            </nav>

            <header className="border-b border-border py-8">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Reports</p>
                <h1 className="mt-2 text-4xl text-ink">Insights for {name}</h1>
                <p className="mt-2 text-muted">Malawi time is used for daily totals and expiry checks.</p>
            </header>

            <section className="py-6">
                <form method="get" action="/reports" className="grid gap-4 rounded border border-border bg-surface p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                    {role === "ADMIN" ? (
                        <label className="text-sm text-muted">
                            Branch
                            <select name="branchId" defaultValue={branchId ?? "all"} className="mt-2 w-full border border-border bg-white px-3 py-2 text-ink">
                                <option value="all">All branches</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                    <label className="text-sm text-muted">
                        From
                        <input name="from" type="date" defaultValue={data.range.from} className="mt-2 w-full border border-border bg-white px-3 py-2 text-ink" />
                    </label>
                    <label className="text-sm text-muted">
                        To
                        <input name="to" type="date" defaultValue={data.range.to} className="mt-2 w-full border border-border bg-white px-3 py-2 text-ink" />
                    </label>
                    <button type="submit" className="self-end border border-primary bg-primary px-4 py-2 font-medium text-primary-fg">Apply</button>
                </form>
            </section>

            <section className="mb-8 border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Sales report</p>
                    <h2 className="mt-2 text-2xl text-ink">Daily totals and product mix</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left">
                        <thead className="border-b border-border bg-surface-strong">
                            <tr>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Day</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Payment</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Product</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Revenue</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Sales</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Lines</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.sales.length ? data.sales.map((row) => (
                                <tr key={`${row.day}-${row.paymentMethod}-${row.product}`} className="border-b border-border last:border-b-0">
                                    <td className="px-4 py-3 text-sm text-ink">{row.day}</td>
                                    <td className="px-4 py-3 text-sm text-muted">{row.paymentMethod}</td>
                                    <td className="px-4 py-3 text-sm text-muted">{row.product}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-ink">{money(row.revenue)}</td>
                                    <td className="px-4 py-3 text-sm text-ink">{row.saleCount}</td>
                                    <td className="px-4 py-3 text-sm text-ink">{row.lineCount}</td>
                                </tr>
                            )) : <tr><td colSpan={6} className="px-4 py-6 text-sm text-muted">No sales in this range.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-8 grid gap-8 lg:grid-cols-2">
                <div className="border border-border bg-surface">
                    <div className="border-b border-border px-5 py-4">
                        <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Low stock</p>
                        <h2 className="mt-2 text-2xl text-ink">Products below reorder point</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-border bg-surface-strong">
                                <tr>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Branch</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Product</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Available</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Threshold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.lowStock.length ? data.lowStock.map((row) => (
                                    <tr key={`${row.branchId}-${row.ingredientName}-${row.brandName}`} className="border-b border-border last:border-b-0">
                                        <td className="px-4 py-3 text-sm text-muted">{row.branchName}</td>
                                        <td className="px-4 py-3 text-sm text-ink">{row.ingredientName} · {row.brandName}</td>
                                        <td className="px-4 py-3 font-mono text-sm text-ink">{row.availableUnits}</td>
                                        <td className="px-4 py-3 font-mono text-sm text-ink">{row.reorderThreshold ?? "—"}</td>
                                    </tr>
                                )) : <tr><td colSpan={4} className="px-4 py-6 text-sm text-muted">No low-stock products.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="border border-border bg-surface">
                    <div className="border-b border-border px-5 py-4">
                        <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Expiry watch</p>
                        <h2 className="mt-2 text-2xl text-ink">Expiring and expired stock</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-border bg-surface-strong">
                                <tr>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Branch</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Product</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Batch</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Expiry</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.expiry.length ? data.expiry.map((row) => (
                                    <tr key={`${row.branchName}-${row.batchNumber}-${row.expiryDate}`} className="border-b border-border last:border-b-0">
                                        <td className="px-4 py-3 text-sm text-muted">{row.branchName}</td>
                                        <td className="px-4 py-3 text-sm text-ink">{row.ingredientName} · {row.brandName}</td>
                                        <td className="px-4 py-3 text-sm text-muted">{row.batchNumber ?? "—"}</td>
                                        <td className="px-4 py-3 text-sm text-muted">{new Date(row.expiryDate).toLocaleDateString("en-MW")}</td>
                                        <td className="px-4 py-3 text-sm text-ink">{row.status}</td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="px-4 py-6 text-sm text-muted">No expiring or expired batches.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Audit log</p>
                    <h2 className="mt-2 text-2xl text-ink">Recent actions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left">
                        <thead className="border-b border-border bg-surface-strong">
                            <tr>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">When</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Action</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Branch</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">User</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Sale</th>
                                <th className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-muted">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.audit.length ? data.audit.map((row) => (
                                <tr key={`${row.createdAt}-${row.action}-${row.saleId ?? row.userName}`} className="border-b border-border last:border-b-0 align-top">
                                    <td className="px-4 py-3 text-sm text-muted">{new Date(row.createdAt).toLocaleString("en-MW")}</td>
                                    <td className="px-4 py-3 text-sm text-ink">{row.action}</td>
                                    <td className="px-4 py-3 text-sm text-muted">{row.branchName}</td>
                                    <td className="px-4 py-3 text-sm text-muted">{row.userName}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-ink">{row.saleId ?? "—"}</td>
                                    <td className="px-4 py-3 text-sm text-muted">{row.details}</td>
                                </tr>
                            )) : <tr><td colSpan={6} className="px-4 py-6 text-sm text-muted">No audit events in this range.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

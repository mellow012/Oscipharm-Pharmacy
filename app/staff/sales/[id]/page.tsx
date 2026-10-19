import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { getSaleDetail } from "@/features/reports/lib/sales-queries";
import { can } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { formatMwk } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StaffSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "reports:branch:view")) redirect("/unauthorized");
  const sale = await getSaleDetail({ role: session.user.role, branchId: session.user.branchId }, (await params).id);
  if (!sale) notFound();
  const timestamp = new Intl.DateTimeFormat("en-MW", { timeZone: "Africa/Blantyre", dateStyle: "full", timeStyle: "short" }).format(sale.createdAt);

  return <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
    <StaffHeader />
    <p className="mt-5"><Link href="/staff/sales" className="text-sm text-primary hover:underline">← Sales and refunds</Link></p>
    <header className="border-b border-border py-7"><p className="font-mono text-xs uppercase tracking-[0.14em] text-warn">{sale.isRefund ? "Refund receipt" : "Sale receipt"}</p><h1 className="mt-2 text-3xl text-ink">{sale.sourceDocumentNumber ?? sale.id}</h1><p className="mt-2 text-sm text-muted">{timestamp} · {sale.branch.name}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span>Payment: {sale.paymentMethod === "UNKNOWN" ? "Not recorded" : sale.paymentMethod}</span>{sale.importRun ? <Link href={`/staff/sales?importRunId=${sale.importRun.id}`} className="text-primary hover:underline">Import run: {sale.importRun.filename}</Link> : null}<span>Total: {formatMwk(Number(sale.totalAmount))}</span></div></header>
    {!sale.stockAffected ? <p className="mt-5 inline-block border border-warn bg-warn-bg/50 px-3 py-2 text-sm text-ink">History only, no stock change</p> : null}
    {sale.isRefund ? <p className="mt-4 text-sm">{sale.original ? <>Original sale: <Link className="text-primary hover:underline" href={`/staff/sales/${sale.original.id}`}>{sale.original.sourceDocumentNumber ?? sale.original.id}</Link></> : sale.stockAffected ? "Original not found, restocked to RETURN batch" : "Original not found"}</p> : null}
    <div className="mt-6 overflow-x-auto border-y border-border"><table className="w-full min-w-[820px] text-left"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="px-3 py-3 font-normal">Product</th><th className="px-3 py-3 font-normal">Qty</th><th className="px-3 py-3 text-right font-normal">Unit price</th><th className="px-3 py-3 text-right font-normal">Line total</th><th className="px-3 py-3 font-normal">Batch</th><th className="px-3 py-3 font-normal">Expiry</th></tr></thead><tbody className="divide-y divide-border">{sale.items.map((item) => <tr key={item.id}><td className="px-3 py-3 text-sm text-ink">{item.variant.ingredient?.name ? `${item.variant.ingredient.name} · ` : ""}{item.variant.brandName} {item.variant.strength ?? ""}</td><td className="px-3 py-3 text-sm">{Math.abs(item.quantityUnits)} {item.variant.unitLabel}{Math.abs(item.quantityUnits) === 1 ? "" : "s"}{item.unallocatedUnits > 0 ? <span className="ml-2 inline-block border border-warn px-2 py-0.5 text-xs text-ink">Unallocated: {item.unallocatedUnits} units</span> : null}</td><td className="px-3 py-3 text-right font-mono text-sm">{formatMwk(Number(item.unitPriceAtSale))}</td><td className="px-3 py-3 text-right font-mono text-sm">{formatMwk(Number(item.subtotal))}</td><td className="px-3 py-3 text-sm text-muted">{item.batch?.batchNumber ?? (item.unallocatedUnits > 0 ? "Unallocated" : "—")}</td><td className="px-3 py-3 text-sm text-muted">{item.batch?.expiryDateKnown ? new Date(item.batch.expiryDate).toLocaleDateString("en-MW", { timeZone: "Africa/Blantyre" }) : item.batch ? "Not recorded" : "—"}</td></tr>)}</tbody></table></div>
  </main>;
}

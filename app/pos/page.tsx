import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PosWorkspace } from "@/features/pos/components/PosWorkspace";
import { getPosProducts } from "@/features/pos/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PosPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "pos:checkout")) redirect("/unauthorized");
    if (!session.user.branchId) return <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6"><div className="border border-border bg-surface p-8"><p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Point of sale</p><h1 className="mt-3 text-4xl text-ink">Checkout is for branch staff</h1><p className="mt-3 text-muted">Admin accounts do not have a branch checkout context.</p></div></main>;
    const products = await getPosProducts(session.user.branchId);
    return <PosWorkspace products={products} name={session.user.name} />;
}
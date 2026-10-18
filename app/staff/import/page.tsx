import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StockImportWorkspace } from "@/features/inventory/components/StockImportWorkspace";
import { loadImportPageData } from "@/features/inventory/lib/import-actions";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StockImportPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "BRANCH_MANAGER") redirect("/unauthorized");

  const params = await searchParams;
  const data = await loadImportPageData(params.branchId);
  if (data.error) {
    return <main className="mx-auto max-w-4xl px-5 py-8"><p role="alert" className="border-l-4 border-danger bg-danger-bg px-4 py-3 text-danger">{data.error}</p></main>;
  }
  if (!data.branch) redirect("/staff");
  return <StockImportWorkspace data={data} requestedBranchId={params.branchId} />;
}

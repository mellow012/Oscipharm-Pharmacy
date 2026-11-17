import type { ReactNode } from "react";
import { getPublicBranches } from "@/features/catalog/lib/queries";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export async function PublicNewsLayout({ children }: { children: ReactNode }) {
    const branches = await getPublicBranches();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            {children}
            <PublicFooter branches={branches} />
        </main>
    );
}
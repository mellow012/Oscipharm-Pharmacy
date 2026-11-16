import type { ReactNode } from "react";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export function PublicNewsLayout({ children }: { children: ReactNode }) {
    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            {children}
        </main>
    );
}
"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "@/features/marketing/components/NavLink";
import { PendingLink } from "@/features/marketing/components/PendingLink";

const navItems = [
    { href: "/catalog", label: "Catalog" },
    { href: "/news", label: "News and events" },
    { href: "/membership", label: "Membership" },
];

export function SiteHeaderClient({ latestPublishedAt }: { latestPublishedAt: string | null }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileOpen) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") return;
            event.preventDefault();
            setMobileOpen(false);
            menuButtonRef.current?.focus();
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileOpen]);

    return (
        <nav aria-label="Public navigation" className="border-b border-outline-variant pb-3 sm:pb-4">
            <div className="flex flex-nowrap items-center justify-between gap-3">
                <PendingLink href="/" aria-current={pathname === "/" ? "page" : undefined} aria-label="OsciPharm home" className="shrink-0 rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={154} height={62} className="h-14 w-auto object-contain lg:h-16" priority />
                </PendingLink>

                <div className="hidden min-w-0 flex-1 items-center justify-center gap-x-1 lg:flex lg:gap-x-2">
                    {navItems.map((item) => (
                        <NavLink key={item.href} href={item.href} label={item.label} latestPublishedAt={latestPublishedAt} variant="desktop" />
                    ))}
                </div>

                <PendingLink href="/login" className="hidden min-h-11 shrink-0 items-center justify-center rounded-sm border border-outline px-4 text-base font-semibold text-primary transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex">Staff sign in</PendingLink>

                <button
                    ref={menuButtonRef}
                    type="button"
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest text-on-surface lg:hidden"
                    aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                    aria-controls="public-mobile-nav"
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((state) => !state)}
                >
                    {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
                </button>
            </div>

            <div id="public-mobile-nav" hidden={!mobileOpen} className="mt-3 space-y-2 border-t border-outline-variant pt-3 lg:hidden">
                {navItems.map((item) => (
                    <NavLink key={item.href} href={item.href} label={item.label} latestPublishedAt={latestPublishedAt} variant="mobile" />
                ))}
                <PendingLink href="/login" className="flex min-h-[52px] w-full items-center rounded-sm border-l-[3px] border-transparent px-3 text-lg font-semibold text-primary transition-colors hover:bg-surface-container-low hover:underline hover:decoration-1 hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:underline focus-visible:decoration-1 focus-visible:underline-offset-4">Staff sign in</PendingLink>
            </div>
        </nav>
    );
}
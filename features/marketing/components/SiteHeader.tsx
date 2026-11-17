"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PendingLink } from "@/features/marketing/components/PendingLink";

const navItems = [
    { href: "/catalog", label: "Catalog" },
    { href: "/news", label: "News and events" },
    { href: "/membership", label: "Membership" },
];

export function SiteHeader() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <nav aria-label="Public navigation" className="border-b border-outline-variant pb-3 sm:pb-4">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                <PendingLink href="/" aria-label="OsciPharm home" className="shrink-0 rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={154} height={62} className="h-14 w-auto object-contain" priority />
                </PendingLink>

                <div className="hidden flex-1 items-center justify-center gap-x-1 sm:flex sm:gap-x-2">
                    {navItems.map((item) => {
                        const isActive = item.href === "/catalog"
                            ? pathname === "/catalog" || pathname.startsWith("/catalog/")
                            : item.href === "/news"
                                ? pathname === "/news" || pathname.startsWith("/news/")
                                : pathname === "/membership";

                        return (
                            <PendingLink
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={`flex min-h-11 items-center rounded-sm px-3 font-label-sm text-label-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isActive ? "text-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                            >
                                {item.label}
                            </PendingLink>
                        );
                    })}
                </div>

                <PendingLink href="/login" className="hidden min-h-11 shrink-0 items-center rounded-sm px-3 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex">Staff sign in</PendingLink>

                <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest px-3 text-on-surface sm:hidden"
                    aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                    aria-controls="public-mobile-nav"
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((state) => !state)}
                >
                    {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
                </button>
            </div>

            {mobileOpen ? (
                <div id="public-mobile-nav" className="mt-3 space-y-2 border-t border-outline-variant pt-3 sm:hidden">
                    {navItems.map((item) => {
                        const isActive = item.href === "/catalog"
                            ? pathname === "/catalog" || pathname.startsWith("/catalog/")
                            : item.href === "/news"
                                ? pathname === "/news" || pathname.startsWith("/news/")
                                : pathname === "/membership";

                        return (
                            <PendingLink
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={`flex min-h-11 items-center rounded-sm px-3 font-label-sm text-label-sm transition-colors ${isActive ? "text-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                            >
                                {item.label}
                            </PendingLink>
                        );
                    })}
                    <PendingLink href="/login" className="flex min-h-11 items-center rounded-sm px-3 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary-fixed/50">Staff sign in</PendingLink>
                </div>
            ) : null}
        </nav>
    );
}

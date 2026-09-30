"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/catalog", label: "Catalog" },
    { href: "/news", label: "News" },
    { href: "/membership", label: "Membership" },
];

export function SiteHeader() {
    const pathname = usePathname();

    return (
        <nav className="flex items-center justify-between gap-4 border-b border-border pb-5">
            <Link href="/" aria-label="OsciPharm home">
                <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={154} height={62} className="h-14 w-auto object-contain" priority />
            </Link>

            <div className="flex flex-1 items-center justify-center">
                <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.12em]">
                    {navItems.map((item) => {
                        const isActive = item.href === "/catalog"
                            ? pathname === "/catalog" || pathname.startsWith("/catalog/")
                            : item.href === "/news"
                                ? pathname === "/news" || pathname.startsWith("/news/")
                                : pathname === "/membership";

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={[
                                    "transition",
                                    isActive ? "border-b border-primary pb-1 text-primary" : "text-muted hover:text-primary",
                                ].join(" ")}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <Link href="/login" className="font-mono text-xs uppercase tracking-[0.12em] text-muted transition hover:text-primary">Staff sign in</Link>
        </nav>
    );
}

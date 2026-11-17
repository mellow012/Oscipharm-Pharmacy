"use client";

import { usePathname } from "next/navigation";
import { NewUpdatesIndicator } from "@/features/marketing/components/NewUpdatesIndicator";
import { PendingLink } from "@/features/marketing/components/PendingLink";
import { isActiveNavItem } from "@/features/marketing/lib/public-navigation.ts";

export function NavLink({
    href,
    label,
    latestPublishedAt,
    variant,
}: {
    href: string;
    label: string;
    latestPublishedAt: string | null;
    variant: "desktop" | "mobile";
}) {
    const pathname = usePathname();
    const active = isActiveNavItem(pathname, href);
    const className = variant === "desktop"
        ? `inline-flex min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-base transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "font-semibold text-ink underline decoration-primary decoration-2 underline-offset-8" : "font-medium text-on-surface-variant hover:text-on-surface hover:underline hover:decoration-1 hover:underline-offset-8 focus-visible:underline focus-visible:decoration-1 focus-visible:underline-offset-8"}`
        : `flex min-h-[52px] w-full items-center rounded-sm border-l-[3px] px-3 text-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary-fixed/40 font-bold text-ink underline decoration-primary decoration-2 underline-offset-4" : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface hover:underline hover:decoration-1 hover:underline-offset-4 focus-visible:underline focus-visible:decoration-1 focus-visible:underline-offset-4"}`;

    return (
        <PendingLink href={href} aria-current={active ? "page" : undefined} className={className}>
            <span className="inline-flex items-center gap-2">
                <span>{label}</span>
                {href === "/news" ? <NewUpdatesIndicator latestPublishedAt={latestPublishedAt} pathname={pathname} /> : null}
            </span>
        </PendingLink>
    );
}
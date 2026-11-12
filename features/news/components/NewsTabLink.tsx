"use client";

import { PendingLink } from "@/features/marketing/components/PendingLink";

type NewsTabLinkProps = {
    href: string;
    current: boolean;
    children: React.ReactNode;
};

export function NewsTabLink({ href, current, children }: NewsTabLinkProps) {
    return (
        <PendingLink href={href} aria-current={current ? "page" : undefined} className={`inline-flex items-center gap-2 pb-3 font-mono text-xs uppercase tracking-[0.1em] ${current ? "border-b-2 border-primary text-primary" : "text-muted hover:text-primary"}`}>
            {children}
        </PendingLink>
    );
}

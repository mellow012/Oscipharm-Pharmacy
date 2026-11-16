"use client";

import { PendingLink } from "@/features/marketing/components/PendingLink";

type NewsTabLinkProps = {
    href: string;
    current: boolean;
    children: React.ReactNode;
};

export function NewsTabLink({ href, current, children }: NewsTabLinkProps) {
    return (
        <PendingLink href={href} aria-current={current ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 font-label-md text-label-md ${current ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"}`}>
            {children}
        </PendingLink>
    );
}

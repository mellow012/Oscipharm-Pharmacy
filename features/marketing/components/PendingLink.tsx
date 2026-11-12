"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";

type PendingLinkProps = React.ComponentProps<typeof Link>;

export function PendingLink({ children, className, ...props }: PendingLinkProps) {
    return (
        <Link {...props} className={`${className ?? ""} relative`}>
            {children}
            <PendingBar />
        </Link>
    );
}

function PendingBar() {
    const { pending } = useLinkStatus();
    if (!pending) return null;

    return <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-primary motion-reduce:animate-none" />;
}

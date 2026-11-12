"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";

let activeId: string | null = null;
const listeners = new Set<() => void>();

function setActive(id: string | null) {
    activeId = id;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return activeId;
}

function useActiveId() {
    return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

type PendingLinkProps = React.ComponentProps<typeof Link>;

export function PendingLink({ children, className, onClick, ...props }: PendingLinkProps) {
    const id = useId();
    const pathname = usePathname();
    const initialMount = useRef(true);

    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }
        setActive(null);
    }, [pathname]);

    return (
        <Link
            {...props}
            onClick={(event) => {
                onClick?.(event);
                if (
                    !event.defaultPrevented
                    && !event.metaKey
                    && !event.ctrlKey
                    && !event.shiftKey
                    && !event.altKey
                    && event.button === 0
                ) {
                    setActive(id);
                }
            }}
            className={`${className ?? ""} relative`}
        >
            {children}
            <PendingBar id={id} />
        </Link>
    );
}

function PendingBar({ id }: { id: string }) {
    const { pending } = useLinkStatus();
    const currentActiveId = useActiveId();
    if (!pending || currentActiveId !== id) return null;

    return <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-primary motion-reduce:animate-none" />;
}
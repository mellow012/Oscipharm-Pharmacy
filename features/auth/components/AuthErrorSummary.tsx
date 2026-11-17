"use client";

import { useEffect, useRef } from "react";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

export function AuthErrorSummary({ message, fieldErrors = {} }: { message?: string | null; fieldErrors?: Record<string, string | undefined> }) {
    const summaryRef = useRef<HTMLDivElement>(null);
    const errors = Object.entries(fieldErrors).filter((entry): entry is [string, string] => Boolean(entry[1]));
    const stateKey = `${message ?? ""}:${errors.map(([field, error]) => `${field}:${error}`).join("|")}`;

    useEffect(() => {
        if (message || errors.length) summaryRef.current?.focus();
    }, [errors.length, message, stateKey]);

    if (!message && !errors.length) return null;

    return (
        <div ref={summaryRef} tabIndex={-1} aria-live="assertive" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-danger">
            <NoticeBanner tone="danger" title="There was a problem">
                {message ? <p>{message}</p> : null}
                {errors.length ? (
                    <ul className={message ? "mt-2 list-inside list-disc" : "list-inside list-disc"}>
                        {errors.map(([field, error]) => <li key={field}><a href={`#${field}`} className="underline underline-offset-2">{error}</a></li>)}
                    </ul>
                ) : null}
            </NoticeBanner>
        </div>
    );
}
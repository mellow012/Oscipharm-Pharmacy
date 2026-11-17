"use client";

import { useEffect, useState } from "react";
import { shouldShowNewDot } from "@/features/news/lib/new-updates.ts";

const LAST_SEEN_KEY = "oscipharm-news-last-seen";
const NEW_DOT_WINDOW_DAYS = 14;

export function NewUpdatesIndicator({ latestPublishedAt, pathname }: { latestPublishedAt: string | null; pathname: string }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!latestPublishedAt) {
            setVisible(false);
            return;
        }

        const visitingNews = pathname === "/news" || pathname.startsWith("/news/");
        let seenAt: string | null = null;
        try {
            seenAt = window.localStorage.getItem(LAST_SEEN_KEY);
        } catch {
            if (visitingNews) {
                setVisible(false);
                return;
            }
            setVisible(shouldShowNewDot(latestPublishedAt, null, new Date(), NEW_DOT_WINDOW_DAYS));
            return;
        }

        if (visitingNews) {
            try {
                window.localStorage.setItem(LAST_SEEN_KEY, latestPublishedAt);
            } catch {
                setVisible(false);
                return;
            }
            setVisible(false);
            return;
        }

        setVisible(shouldShowNewDot(latestPublishedAt, seenAt, new Date(), NEW_DOT_WINDOW_DAYS));
    }, [latestPublishedAt, pathname]);

    return (
        <>
            <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden="true">
                <span className={`h-2.5 w-2.5 rounded-full bg-status-success ${visible ? "visible" : "invisible"}`} />
            </span>
            {visible ? <span className="sr-only">New updates available</span> : null}
        </>
    );
}
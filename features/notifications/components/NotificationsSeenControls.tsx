"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { markNotificationsSeenAction } from "@/features/notifications/lib/actions";

export function NotificationsSeenControls() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        void markNotificationsSeenAction();
    }, []);

    function markAllAsSeen() {
        startTransition(async () => {
            const result = await markNotificationsSeenAction();
            if (result.ok) router.refresh();
        });
    }

    return (
        <button
            type="button"
            onClick={markAllAsSeen}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md font-medium text-on-surface hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
            <Check aria-hidden="true" size={17} />
            {pending ? "Saving…" : "Mark all as seen"}
        </button>
    );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteNewsPostAction, publishNewsPostAction, unpublishNewsPostAction } from "../lib/actions";
import type { NewsStatus } from "@prisma/client";

export function NewsPostActions({ postId, status }: { postId: string; status: NewsStatus }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function run(action: "publish" | "unpublish" | "delete") {
        const prompts = {
            publish: "Publish this post so it is visible on the public site?",
            unpublish: "Unpublish this post? It will no longer appear on the public site.",
            delete: "Delete this post permanently? This cannot be undone.",
        };
        if (!window.confirm(prompts[action])) return;

        setError(null);
        setPending(true);
        const result = action === "publish"
            ? await publishNewsPostAction(postId)
            : action === "unpublish"
                ? await unpublishNewsPostAction(postId)
                : await deleteNewsPostAction(postId);
        setPending(false);
        if (!result.ok) {
            setError(result.message);
            return;
        }
        if (action === "delete") router.push("/staff/news");
        router.refresh();
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            {status === "PUBLISHED" ? (
                <button type="button" disabled={pending} onClick={() => run("unpublish")} className="border border-border px-3 py-2 text-sm text-ink disabled:opacity-60">Unpublish</button>
            ) : (
                <button type="button" disabled={pending} onClick={() => run("publish")} className="bg-primary px-3 py-2 text-sm text-white disabled:opacity-60">Publish</button>
            )}
            <button type="button" disabled={pending} onClick={() => run("delete")} className="border border-border px-3 py-2 text-sm text-warn disabled:opacity-60">Delete</button>
            {error ? <span role="alert" className="w-full text-sm text-warn">{error}</span> : null}
        </div>
    );
}
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createNewsPostAction, updateNewsPostAction } from "../lib/actions";
import type { NewsInputPayload } from "../types";
import type { NewsType } from "@prisma/client";

type InitialNews = {
    id?: string;
    title: string;
    type: NewsType;
    excerpt: string | null;
    body: string;
    eventStartsAt: string;
    eventEndsAt: string;
    eventLocation: string | null;
};

export function NewsForm({ initial, typeLocked = false }: { initial: InitialNews; typeLocked?: boolean }) {
    const router = useRouter();
    const [title, setTitle] = useState(initial.title);
    const [type, setType] = useState<NewsType>(initial.type);
    const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
    const [body, setBody] = useState(initial.body);
    const [eventStartsAt, setEventStartsAt] = useState(initial.eventStartsAt);
    const [eventEndsAt, setEventEndsAt] = useState(initial.eventEndsAt);
    const [eventLocation, setEventLocation] = useState(initial.eventLocation ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setPending(true);
        const input: NewsInputPayload = { title, type, excerpt, body, eventStartsAt, eventEndsAt, eventLocation };
        const result = initial.id
            ? await updateNewsPostAction(initial.id, input)
            : await createNewsPostAction(input);
        setPending(false);

        if (!result.ok) {
            setError(result.message);
            return;
        }
        if (result.newsId) router.push(`/staff/news/${result.newsId}/preview`);
        router.refresh();
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} required className="w-full border border-border bg-surface px-3 py-2 text-ink" />
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Post type</span>
                <select value={type} disabled={typeLocked} onChange={(event) => setType(event.target.value as NewsType)} className="w-full border border-border bg-surface px-3 py-2 text-ink disabled:opacity-70">
                    <option value="NEWS">News</option>
                    <option value="EVENT">Event</option>
                </select>
                {typeLocked ? <span className="mt-1 block text-xs text-muted">Post type cannot be changed after creation.</span> : null}
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Excerpt</span>
                <textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} maxLength={300} rows={3} className="w-full border border-border bg-surface px-3 py-2 text-ink" />
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Body</span>
                <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={20000} rows={12} required className="w-full resize-y border border-border bg-surface px-3 py-2 text-ink" />
                <span className="mt-1 block text-xs text-muted">Plain text, up to 20,000 characters.</span>
            </label>

            {type === "EVENT" ? (
                <fieldset className="space-y-4 border-t border-border pt-5">
                    <legend className="text-lg text-ink">Event details</legend>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-ink">Starts · Malawi time (CAT)</span>
                        <input type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} required className="w-full border border-border bg-surface px-3 py-2 text-ink" />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-ink">Ends · Malawi time (CAT)</span>
                        <input type="datetime-local" value={eventEndsAt} onChange={(event) => setEventEndsAt(event.target.value)} className="w-full border border-border bg-surface px-3 py-2 text-ink" />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-ink">Location</span>
                        <input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} maxLength={200} className="w-full border border-border bg-surface px-3 py-2 text-ink" />
                    </label>
                </fieldset>
            ) : null}

            {error ? <p role="alert" className="text-sm text-warn">{error}</p> : null}
            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <button type="submit" disabled={pending} className="bg-primary px-4 py-2 font-medium text-white disabled:opacity-60">
                    {pending ? "Saving…" : initial.id ? "Save changes" : "Save preview"}
                </button>
                <button type="button" onClick={() => router.back()} className="border border-border px-4 py-2 text-ink">Cancel</button>
            </div>
        </form>
    );
}
"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteImageAction, moveImageAction, updateImageTextAction } from "../lib/image-actions";
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST } from "../lib/image-rules";

type ImageRow = {
    id: string;
    url: string;
    altText: string | null;
    caption: string | null;
    sortOrder: number;
};

type UploadItem = { id: string; name: string; status: "waiting" | "uploading" | "done" | "failed"; message?: string };

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function compressPhoto(file: File): Promise<Blob> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new Error("This browser can't read that photo, try a JPEG");
    }
    try {
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This browser can't read that photo, try a JPEG");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const webp = await canvasBlob(canvas, "image/webp", 0.82);
        if (webp?.type === "image/webp") return webp;
        const jpeg = await canvasBlob(canvas, "image/jpeg", 0.85);
        if (!jpeg || jpeg.type !== "image/jpeg") throw new Error("This browser can't read that photo, try a JPEG");
        return jpeg;
    } finally {
        bitmap.close();
    }
}

function ImageEditorRow({ image, index, total, postId, onChanged }: {
    image: ImageRow;
    index: number;
    total: number;
    postId: string;
    onChanged: () => void;
}) {
    const [altText, setAltText] = useState(image.altText ?? "");
    const [caption, setCaption] = useState(image.caption ?? "");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function run(action: () => Promise<{ ok: boolean; message: string }>) {
        setBusy(true);
        setMessage("");
        try {
            const result = await action();
            setMessage(result.message);
            if (result.ok) onChanged();
        } catch {
            setMessage("Image action failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <li className="grid gap-4 border-b border-border py-4 sm:grid-cols-[8rem_1fr]">
            <img src={image.url} alt={image.altText ?? ""} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded object-cover" />
            <div className="space-y-3">
                <label className="block text-sm text-ink">Alt text
                    <input value={altText} maxLength={200} onChange={(event) => setAltText(event.target.value)} className="mt-1 min-h-11 w-full border border-border bg-surface px-3 py-2" />
                </label>
                <label className="block text-sm text-ink">Caption
                    <input value={caption} maxLength={300} onChange={(event) => setCaption(event.target.value)} className="mt-1 min-h-11 w-full border border-border bg-surface px-3 py-2" />
                </label>
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void run(() => updateImageTextAction(image.id, altText, caption))} className="min-h-11 border border-primary px-3 py-2 text-sm text-primary disabled:opacity-50">Save text</button>
                    <button type="button" disabled={busy || index === 0} onClick={() => void run(() => moveImageAction(image.id, "up"))} className="min-h-11 border border-border px-3 py-2 text-sm disabled:opacity-50">Move up</button>
                    <button type="button" disabled={busy || index === total - 1} onClick={() => void run(() => moveImageAction(image.id, "down"))} className="min-h-11 border border-border px-3 py-2 text-sm disabled:opacity-50">Move down</button>
                    <button type="button" disabled={busy} onClick={() => {
                        if (window.confirm("Delete this image? This cannot be undone.")) void run(() => deleteImageAction(image.id));
                    }} className="min-h-11 border border-warn px-3 py-2 text-sm text-warn disabled:opacity-50">Delete</button>
                </div>
                {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
            </div>
        </li>
    );
}

export function NewsGalleryEditor({ postId, images }: { postId: string; images: ImageRow[] }) {
    const router = useRouter();
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [notice, setNotice] = useState("");
    const atLimit = images.length >= MAX_IMAGES_PER_POST;

    async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        setNotice("");
        let currentCount = images.length;
        const items: UploadItem[] = selected.map((file, index) => ({ id: `${Date.now()}-${index}`, name: file.name, status: "waiting" }));
        setUploads((existing) => [...existing, ...items]);

        for (let index = 0; index < selected.length; index += 1) {
            const file = selected[index];
            const itemId = items[index].id;
            if (currentCount >= MAX_IMAGES_PER_POST) {
                setUploads((existing) => existing.map((item) => item.id === itemId ? { ...item, status: "failed", message: "This post already has 8 images." } : item));
                continue;
            }
            setUploads((existing) => existing.map((item) => item.id === itemId ? { ...item, status: "uploading" } : item));
            try {
                const compressed = await compressPhoto(file);
                if (compressed.size > MAX_IMAGE_BYTES) throw new Error("This photo is larger than 4 MiB after compression.");
                const formData = new FormData();
                formData.set("file", compressed, file.name);
                formData.set("altText", "");
                formData.set("caption", "");
                const response = await fetch(`/api/staff/news/${postId}/images`, { method: "POST", body: formData });
                const result = await response.json() as { ok?: boolean; message?: string };
                if (!response.ok || !result.ok) throw new Error(result.message ?? "Image upload failed.");
                currentCount += 1;
                setUploads((existing) => existing.map((item) => item.id === itemId ? { ...item, status: "done", message: "Uploaded." } : item));
                setNotice("Image upload completed.");
                router.refresh();
            } catch (error) {
                const message = error instanceof Error ? error.message : "Image upload failed.";
                setUploads((existing) => existing.map((item) => item.id === itemId ? { ...item, status: "failed", message } : item));
            }
        }
    }

    return (
        <section className="mt-8 border-t border-border pt-6" aria-labelledby="gallery-heading">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="gallery-heading" className="text-xl text-ink">Photo gallery</h2>
                <span className="font-mono text-xs text-muted">{images.length} of {MAX_IMAGES_PER_POST}</span>
            </div>
            {images.length ? (
                <ul className="mt-3 divide-y divide-border">
                    {[...images].sort((left, right) => left.sortOrder - right.sortOrder).map((image, index, ordered) => (
                        <ImageEditorRow key={image.id} image={image} index={index} total={ordered.length} postId={postId} onChanged={() => router.refresh()} />
                    ))}
                </ul>
            ) : <p className="mt-3 text-sm text-muted">No photos added.</p>}
            <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center border border-primary px-4 py-2 text-sm text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                Add photos
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={atLimit} onChange={handleFiles} className="sr-only" aria-label="Add photos" />
            </label>
            <div aria-live="polite" className="mt-3 space-y-2">
                {notice ? <p className="text-sm text-muted">{notice}</p> : null}
                {uploads.map((item) => <p key={item.id} className="text-sm text-muted">{item.name}: {item.status}{item.message ? ` - ${item.message}` : ""}</p>)}
            </div>
        </section>
    );
}
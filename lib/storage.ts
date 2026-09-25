import { createClient } from "@supabase/supabase-js";
import { isAllowedImageMimeType } from "@/features/news/lib/news";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function hasStorageConfig() {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET);
}

export function getStoragePublicUrl(path: string, bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "public") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    if (!base) return path;
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function assertAllowedUpload(file: Pick<File, "type" | "size">) {
    if (!isAllowedImageMimeType(file.type)) {
        throw new Error("Only JPEG, PNG, WebP, and AVIF files are allowed.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Upload must be 50MB or smaller.");
    }
    return true;
}

export async function createSignedUploadUrl({
    bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "public",
    folder,
    fileName,
    contentType,
    fileSize,
}: {
    bucket?: string;
    folder: string;
    fileName: string;
    contentType: string;
    fileSize?: number;
}) {
    if (!hasStorageConfig()) {
        throw new Error("Supabase Storage is not configured. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.");
    }
    if (!isAllowedImageMimeType(contentType)) {
        throw new Error("Only JPEG, PNG, WebP, and AVIF files are allowed.");
    }
    if (typeof fileSize === "number" && fileSize > MAX_UPLOAD_BYTES) {
        throw new Error("Upload must be 50MB or smaller.");
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const path = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9_.-]+/g, "-")}`;
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, {
        upsert: false,
    });
    if (error) throw error;
    return { ...data, path, publicUrl: getStoragePublicUrl(path, bucket) };
}

export const MAX_IMAGES_PER_POST = 8;
export const MAX_IMAGE_BYTES = 4_194_304;
export const ALT_MAX = 200;
export const CAPTION_MAX = 300;

export type ImageType = { mime: string; ext: string };

export type StorageResult<T> = { ok: true } & T | { ok: false; reason: string };

export type NewsImageStorage = {
    isConfigured(): boolean;
    upload(path: string, bytes: Uint8Array, contentType: string): Promise<StorageResult<{ url: string }>>;
    remove(path: string): Promise<{ ok: true } | { ok: false; reason: string }>;
};

export function detectImageType(bytes: Uint8Array): ImageType | null {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
    }
    if (bytes.length >= 8
        && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
        return { mime: "image/png", ext: "png" };
    }
    if (bytes.length >= 12
        && ascii(bytes, 0, 4) === "RIFF"
        && ascii(bytes, 8, 12) === "WEBP") {
        return { mime: "image/webp", ext: "webp" };
    }
    if (bytes.length >= 12
        && ascii(bytes, 4, 8) === "ftyp"
        && ["avif", "avis"].includes(ascii(bytes, 8, 12))) {
        return { mime: "image/avif", ext: "avif" };
    }
    return null;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
    let value = "";
    for (let index = start; index < end; index += 1) value += String.fromCharCode(bytes[index]);
    return value;
}

export function isImageSizeAllowed(size: number): boolean {
    return Number.isSafeInteger(size) && size > 0 && size <= MAX_IMAGE_BYTES;
}

export function buildStoragePath(postId: string, ext: string): string {
    return `news/${postId}/${globalThis.crypto.randomUUID()}.${ext}`;
}

export function normalizeText(value: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
    if (typeof value !== "string") return { ok: false };
    const normalized = value.trim();
    if (normalized.length > max) return { ok: false };
    return { ok: true, value: normalized || null };
}

export function reorderIds(orderedIds: readonly string[], id: string, direction: "up" | "down"): string[] {
    const result = [...orderedIds];
    const currentIndex = result.indexOf(id);
    if (currentIndex < 0) return result;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= result.length) return result;
    [result[currentIndex], result[targetIndex]] = [result[targetIndex], result[currentIndex]];
    return result;
}

export function canAddImage(currentCount: number): boolean {
    return currentCount < MAX_IMAGES_PER_POST;
}
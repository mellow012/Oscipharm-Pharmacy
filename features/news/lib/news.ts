export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120)
        || "post";
}

export function isAllowedImageMimeType(value: string) {
    return ALLOWED_IMAGE_MIME_TYPES.includes(value as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]);
}

export function buildNewsImagePath(slug: string, fileName: string) {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]+/g, "-").toLowerCase();
    return `${slug}/${Date.now()}-${cleanName}`;
}

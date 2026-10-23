import "server-only";
import { Buffer } from "node:buffer";
import type { NewsImageStorage } from "../features/news/lib/image-rules.ts";

const BUCKET = "news-images";

function config() {
    const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    return url && key ? { url, key } : null;
}

function encodePath(path: string) {
    return path.split("/").map(encodeURIComponent).join("/");
}

export function createStorage(): NewsImageStorage {
    return {
        isConfigured() {
            return config() !== null;
        },
        async upload(path, bytes, contentType) {
            const settings = config();
            if (!settings) return { ok: false, reason: "not_configured" };
            try {
                const response = await fetch(`${settings.url}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
                    method: "POST",
                    headers: {
                        apikey: settings.key,
                        Authorization: `Bearer ${settings.key}`,
                        "Content-Type": contentType,
                        "x-upsert": "false",
                    },
                    body: Buffer.from(bytes),
                });
                if (!response.ok) {
                    const body = (await response.text().catch(() => "")).slice(0, 200);
                    console.error("news image upload failed:", response.status, body);
                    return { ok: false, reason: `upload_http_${response.status}` };
                }
                return {
                    ok: true,
                    url: `${settings.url}/storage/v1/object/public/${BUCKET}/${encodePath(path)}`,
                };
            } catch {
                return { ok: false, reason: "upload_failed" };
            }
        },
        async remove(path) {
            const settings = config();
            if (!settings) return { ok: false, reason: "not_configured" };
            try {
                const response = await fetch(`${settings.url}/storage/v1/object/${BUCKET}`, {
                    method: "DELETE",
                    headers: {
                        apikey: settings.key,
                        Authorization: `Bearer ${settings.key}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ prefixes: [path] }),
                });
                if (response.ok || response.status === 404) return { ok: true };
                return { ok: false, reason: `remove_http_${response.status}` };
            } catch {
                return { ok: false, reason: "remove_failed" };
            }
        },
    };
}
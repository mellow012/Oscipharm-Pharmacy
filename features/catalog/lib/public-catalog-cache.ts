import { revalidateTag } from "next/cache";

export const PUBLIC_CATALOG_CACHE_TAG = "public-catalog";

export function revalidatePublicCatalog() {
    revalidateTag(PUBLIC_CATALOG_CACHE_TAG, "max");
}
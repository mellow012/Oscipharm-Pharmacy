import { getLatestPublishedAt } from "@/features/news/lib/queries";
import { SiteHeaderClient } from "@/features/marketing/components/SiteHeaderClient";

export async function SiteHeader() {
    const latestPublishedAt = await getLatestPublishedAt();
    return <SiteHeaderClient latestPublishedAt={latestPublishedAt} />;
}

import type { ComponentProps } from "react";
import { NewsCard } from "@/features/news/components/NewsCard";
import { PublicNewsLayout } from "@/features/news/components/PublicNewsLayout";
import { NewsTabLink } from "@/features/news/components/NewsTabLink";
import { getPublicFeed } from "@/features/news/lib/queries";
import { normalizeTab, type NewsTab } from "@/features/news/lib/news-feed";

export const dynamic = "force-dynamic";

const tabs: Array<{ tab: NewsTab; label: string; href: string }> = [
    { tab: "all", label: "All", href: "/news" },
    { tab: "news", label: "News", href: "/news?tab=news" },
    { tab: "events", label: "Events", href: "/news?tab=events" },
];

type NewsCardPost = ComponentProps<typeof NewsCard>["post"];

function NewsPageHeading({ tab }: { tab: NewsTab }) {
    return (
        <>
            <header className="border-b border-outline-variant pb-7 pt-8 sm:pb-9 sm:pt-12">
                <p className="font-eyebrow text-eyebrow uppercase text-secondary">News and events</p>
                <h1 className="mt-3 font-display text-headline-xl text-primary">Pharmacy updates</h1>
            </header>
            <nav aria-label="News filters" className="mb-7 flex gap-2 border-b border-outline-variant">
                {tabs.map((item) => (
                    <NewsTabLink key={item.tab} href={item.href} current={item.tab === tab}>
                        {item.label}
                    </NewsTabLink>
                ))}
            </nav>
        </>
    );
}

function NewsGrid({ posts, now }: { posts: NewsCardPost[]; now: Date }) {
    return (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {posts.map((post) => <NewsCard key={post.id} post={post} now={now} />)}
        </div>
    );
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
    const params = await searchParams;
    const tab = normalizeTab(params.tab);
    const now = new Date();

    if (tab === "events") {
        const { upcoming, past } = await getPublicFeed("events", now);
        return (
            <PublicNewsLayout>
                <NewsPageHeading tab={tab} />
                <div className="space-y-10">
                    <section aria-labelledby="upcoming-events-heading">
                        <h2 id="upcoming-events-heading" className="mb-4 font-display text-headline-md text-ink">Upcoming events</h2>
                        {upcoming.length ? <NewsGrid posts={upcoming} now={now} /> : <p className="text-body-md text-on-surface-variant">No upcoming events right now</p>}
                    </section>
                    <section aria-labelledby="past-events-heading">
                        <h2 id="past-events-heading" className="mb-4 font-display text-headline-md text-ink">Past events</h2>
                        {past.length ? <NewsGrid posts={past} now={now} /> : <p className="text-body-md text-on-surface-variant">No past events yet.</p>}
                    </section>
                </div>
            </PublicNewsLayout>
        );
    }

    const { items } = await getPublicFeed(tab, now);
    return (
        <PublicNewsLayout>
            <NewsPageHeading tab={tab} />
            {items.length ? (
                <NewsGrid posts={items} now={now} />
            ) : (
                <p className="text-body-md text-on-surface-variant">
                    {tab === "news" ? "No public news yet." : "No public news or upcoming events yet."}
                </p>
            )}
        </PublicNewsLayout>
    );
}
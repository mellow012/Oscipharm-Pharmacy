import Link from "next/link";
import { formatBlantyreDateTime } from "@/lib/timezone";
import { getPublicFeed } from "@/features/news/lib/queries";
import { normalizeTab, type NewsTab } from "@/features/news/lib/news-feed";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export const dynamic = "force-dynamic";

type PublicPost = {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    type: "NEWS" | "EVENT";
    publishedAt: Date;
    eventStartsAt: Date | null;
    createdBy: { name: string };
    images: Array<{ id: string; url: string; altText: string | null; sortOrder: number }>;
};

function NewsCard({ post }: { post: PublicPost }) {
    const isEvent = post.type === "EVENT";
    return (
        <article className="rounded border border-border bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                <span>{isEvent && post.eventStartsAt
                    ? `${formatBlantyreDateTime(post.eventStartsAt)} CAT`
                    : formatBlantyreDateTime(post.publishedAt)}</span>
                <div className="flex items-center gap-3">
                    {isEvent ? <span className="border border-warn px-2 py-1 font-mono text-[0.65rem] uppercase text-warn">Event</span> : null}
                    <span>By {post.createdBy.name}</span>
                </div>
            </div>
            {post.images[0] ? (
                <div className="mb-4 aspect-[4/3] overflow-hidden rounded">
                    <img src={post.images[0].url} alt={post.images[0].altText ?? post.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </div>
            ) : null}
            <h2 className="text-2xl text-ink">{post.title}</h2>
            {post.excerpt ? <p className="mt-3 text-muted">{post.excerpt}</p> : null}
            <Link href={`/news/${post.slug}`} className="mt-4 inline-block text-primary hover:underline">{isEvent ? "View event" : "Read article"}</Link>
        </article>
    );
}

const tabs: Array<{ tab: NewsTab; label: string; href: string }> = [
    { tab: "all", label: "All", href: "/news" },
    { tab: "news", label: "News", href: "/news?tab=news" },
    { tab: "events", label: "Events", href: "/news?tab=events" },
];

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
    const params = await searchParams;
    const tab = normalizeTab(params.tab);
    const now = new Date();

    if (tab === "events") {
        const { upcoming, past } = await getPublicFeed("events", now);
        return (
            <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
                <SiteHeader />
                <header className="mb-8 border-b border-border pb-6 pt-8">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">News and events</p>
                    <h1 className="mt-2 text-4xl text-ink">Pharmacy updates</h1>
                </header>
                <nav aria-label="News filters" className="mb-6 flex gap-5 border-b border-border">
                    {tabs.map((item) => <Link key={item.tab} href={item.href} aria-current={item.tab === tab ? "page" : undefined} className={`pb-3 font-mono text-xs uppercase tracking-[0.1em] ${item.tab === tab ? "border-b-2 border-primary text-primary" : "text-muted hover:text-primary"}`}>{item.label}</Link>)}
                </nav>
                {upcoming.length || past.length ? (
                    <div className="space-y-10">
                        {upcoming.length ? <section aria-labelledby="upcoming-events-heading"><h2 id="upcoming-events-heading" className="mb-4 text-2xl text-ink">Upcoming events</h2><div className="grid gap-5">{upcoming.map((post) => <NewsCard key={post.id} post={post} />)}</div></section> : null}
                        {past.length ? <section aria-labelledby="past-events-heading"><h2 id="past-events-heading" className="mb-4 text-2xl text-ink">Past events</h2><div className="grid gap-5">{past.map((post) => <NewsCard key={post.id} post={post} />)}</div></section> : null}
                    </div>
                ) : <p className="text-muted">No public events yet.</p>}
            </main>
        );
    }

    const { items } = await getPublicFeed(tab, now);

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <SiteHeader />

            <header className="mb-8 border-b border-border pb-6 pt-8">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">News and events</p>
                <h1 className="mt-2 text-4xl text-ink">Pharmacy updates</h1>
            </header>

            <nav aria-label="News filters" className="mb-6 flex gap-5 border-b border-border">
                {tabs.map((item) => <Link key={item.tab} href={item.href} aria-current={item.tab === tab ? "page" : undefined} className={`pb-3 font-mono text-xs uppercase tracking-[0.1em] ${item.tab === tab ? "border-b-2 border-primary text-primary" : "text-muted hover:text-primary"}`}>{item.label}</Link>)}
            </nav>
            <div className="grid gap-6">
                {items.length ? items.map((post) => <NewsCard key={post.id} post={post} />) : <p className="text-muted">{tab === "news" ? "No public news yet." : "No public news or upcoming events yet."}</p>}
            </div>
        </main>
    );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsArticleBody } from "@/features/news/components/NewsArticleBody";
import { NewsGallery } from "@/features/news/components/NewsGallery";
import { PublicNewsLayout } from "@/features/news/components/PublicNewsLayout";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { formatNewsDate } from "@/features/news/lib/news-dates";
import { eventEffectiveEnd, isUpcomingEvent } from "@/features/news/lib/news-feed";
import { getNewsBySlug } from "@/features/news/lib/queries";

export const dynamic = "force-dynamic";

function estimatedReadMinutes(body: string) {
    const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getNewsBySlug(slug);
    if (!post) notFound();

    const isEvent = post.type === "EVENT";
    const now = new Date();
    const effectiveEnd = isEvent ? eventEffectiveEnd(post) : null;
    const upcoming = isEvent && isUpcomingEvent(post, now);
    const past = Boolean(effectiveEnd && effectiveEnd < now);
    const updatedMeaningfully = Math.abs(post.updatedAt.getTime() - post.publishedAt.getTime()) >= 60_000;

    return (
        <PublicNewsLayout>
            <article>
                <header className="mx-auto max-w-4xl border-b border-outline-variant pb-7 pt-8 sm:pb-9 sm:pt-12">
                    <StatusBadge>{isEvent ? "Event" : "News"}</StatusBadge>
                    <h1 className="mt-4 font-display text-headline-xl leading-tight text-primary">{post.title}</h1>
                    {post.excerpt ? <p className="mt-4 max-w-3xl text-body-lg text-on-surface-variant">{post.excerpt}</p> : null}
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-on-surface-variant">
                        <span>Published {formatNewsDate(post.publishedAt, true)} CAT</span>
                        <span>By {post.createdBy.name}</span>
                        <span>{estimatedReadMinutes(post.body)} min read</span>
                        {updatedMeaningfully ? <span>Updated {formatNewsDate(post.updatedAt, true)} CAT</span> : null}
                    </div>
                </header>

                {isEvent ? (
                    <section aria-label="Event details" className="mx-auto mt-6 max-w-4xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-display text-headline-sm text-ink">Event details</h2>
                            {upcoming ? <StatusBadge tone="success">Upcoming</StatusBadge> : null}
                            {past ? <StatusBadge tone="neutral">Past</StatusBadge> : null}
                        </div>
                        <dl className="grid gap-4 text-body-md sm:grid-cols-2">
                            <div>
                                <dt className="text-on-surface-variant">Starts · CAT</dt>
                                <dd className="mt-1 text-on-surface">{post.eventStartsAt ? `${formatNewsDate(post.eventStartsAt, true)} CAT` : "Date to be announced"}</dd>
                            </div>
                            {post.eventEndsAt ? (
                                <div>
                                    <dt className="text-on-surface-variant">Ends · CAT</dt>
                                    <dd className="mt-1 text-on-surface">{formatNewsDate(post.eventEndsAt, true)} CAT</dd>
                                </div>
                            ) : null}
                            {post.eventLocation ? (
                                <div className="sm:col-span-2">
                                    <dt className="text-on-surface-variant">Location</dt>
                                    <dd className="mt-1 text-on-surface">{post.eventLocation}</dd>
                                </div>
                            ) : null}
                        </dl>
                    </section>
                ) : null}

                <NewsGallery images={post.images} title={post.title} />
                <NewsArticleBody body={post.body} />
            </article>
            <footer className="mx-auto mt-10 max-w-4xl border-t border-outline-variant py-6">
                <Link href="/news" className="inline-flex min-h-11 items-center font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline">
                    Back to news and events
                </Link>
            </footer>
        </PublicNewsLayout>
    );
}
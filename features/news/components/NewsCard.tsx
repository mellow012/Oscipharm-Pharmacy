import Link from "next/link";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { formatNewsDate } from "@/features/news/lib/news-dates";
import { eventEffectiveEnd, isUpcomingEvent } from "@/features/news/lib/news-feed";

type NewsCardPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    type: "NEWS" | "EVENT";
    publishedAt: Date;
    eventStartsAt: Date | null;
    eventEndsAt: Date | null;
    eventLocation: string | null;
    createdBy: { name: string };
    images: Array<{ id: string; url: string; altText: string | null }>;
};

export function NewsCard({ post, now }: { post: NewsCardPost; now: Date }) {
    const isEvent = post.type === "EVENT";
    const isUpcoming = isEvent && isUpcomingEvent(post, now);
    const effectiveEnd = isEvent ? eventEffectiveEnd(post) : null;
    const isPast = Boolean(effectiveEnd && effectiveEnd < now);
    const image = post.images[0];

    return (
        <Link
            href={`/news/${post.slug}`}
            aria-label={`${isEvent ? "View event" : "Read article"}: ${post.title}`}
            className="group flex h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
            <article className="flex h-full w-full flex-col overflow-hidden border border-outline-variant bg-surface-container-lowest transition-colors group-hover:border-primary">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container-low">
                    {image ? (
                        <img
                            src={image.url}
                            alt={image.altText ?? post.title}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-contain"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center font-label-sm text-label-sm text-on-surface-variant">OsciPharm updates</div>
                    )}
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge>{isEvent ? "Event" : "News"}</StatusBadge>
                        {isUpcoming ? <StatusBadge tone="success">Upcoming</StatusBadge> : null}
                        {isPast ? <StatusBadge tone="neutral">Past</StatusBadge> : null}
                    </div>
                    <h2 className="mt-3 line-clamp-2 font-display text-headline-md text-ink group-hover:text-primary">{post.title}</h2>
                    {post.excerpt ? <p className="mt-2 line-clamp-3 text-body-md text-on-surface-variant">{post.excerpt}</p> : null}
                    <div className="mt-4 flex flex-1 flex-col gap-1 border-t border-outline-variant pt-3 text-body-sm text-on-surface-variant">
                        <p>
                            {isEvent && post.eventStartsAt
                                ? `${formatNewsDate(post.eventStartsAt, true)} CAT`
                                : formatNewsDate(post.publishedAt)}
                        </p>
                        {isEvent && post.eventLocation ? <p className="line-clamp-1">{post.eventLocation}</p> : null}
                        <p>By {post.createdBy.name}</p>
                    </div>
                    <span className="mt-4 min-h-11 self-start py-3 font-label-md text-label-md font-semibold text-primary underline-offset-4 group-hover:underline">
                        {isEvent ? "View event" : "Read article"}
                    </span>
                </div>
            </article>
        </Link>
    );
}
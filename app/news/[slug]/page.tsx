import { notFound } from "next/navigation";
import { formatBlantyreDateTime } from "@/lib/timezone";
import { getNewsBySlug } from "@/features/news/lib/queries";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getNewsBySlug(slug);
    if (!post) notFound();

    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-8">
            <SiteHeader />
            <article className="mt-6 rounded border border-border bg-surface p-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">{post.type === "EVENT" ? "Event" : "News"}</p>
                <h1 className="mt-3 text-4xl text-ink">{post.title}</h1>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted">
                    <span>{formatBlantyreDateTime(post.publishedAt)}</span>
                    <span>By {post.createdBy.name}</span>
                </div>
                {post.type === "EVENT" ? (
                    <dl className="mt-5 grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted">Starts · Malawi time (CAT)</dt><dd className="mt-1 text-ink">{post.eventStartsAt ? `${formatBlantyreDateTime(post.eventStartsAt)} CAT` : "Date to be announced"}</dd></div>
                        {post.eventEndsAt ? <div><dt className="text-muted">Ends · Malawi time (CAT)</dt><dd className="mt-1 text-ink">{formatBlantyreDateTime(post.eventEndsAt)} CAT</dd></div> : null}
                        {post.eventLocation ? <div><dt className="text-muted">Location</dt><dd className="mt-1 text-ink">{post.eventLocation}</dd></div> : null}
                    </dl>
                ) : null}
                {post.images.length ? (
                    <div className="mt-6 grid gap-4">
                        {post.images.map((image) => (
                            <img key={image.id} src={image.url} alt={image.altText ?? post.title} className="max-h-[420px] w-full rounded object-cover" />
                        ))}
                    </div>
                ) : null}
                <div className="mt-6 whitespace-pre-wrap text-base leading-7 text-ink">{post.body}</div>
            </article>
        </main>
    );
}

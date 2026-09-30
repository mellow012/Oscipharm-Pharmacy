import Link from "next/link";
import { notFound } from "next/navigation";
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
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">News</p>
                <h1 className="mt-3 text-4xl text-ink">{post.title}</h1>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted">
                    <span>{new Date(post.publishedAt).toLocaleDateString("en-MW")}</span>
                    <span>By {post.createdBy.name}</span>
                </div>
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

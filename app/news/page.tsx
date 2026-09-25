import Link from "next/link";
import { getPublishedNews } from "@/features/news/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
    const posts = await getPublishedNews();

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <header className="mb-8 border-b border-border pb-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">News</p>
                <h1 className="mt-2 text-4xl text-ink">Pharmacy updates</h1>
            </header>

            <div className="grid gap-6">
                {posts.length ? posts.map((post) => (
                    <article key={post.id} className="rounded border border-border bg-surface p-5">
                        <div className="mb-3 flex items-center justify-between gap-4 text-sm text-muted">
                            <span>{new Date(post.publishedAt).toLocaleDateString("en-MW")}</span>
                            <span>By {post.createdBy.name}</span>
                        </div>
                        <h2 className="text-2xl text-ink">{post.title}</h2>
                        {post.excerpt ? <p className="mt-3 text-muted">{post.excerpt}</p> : null}
                        <Link href={`/news/${post.slug}`} className="mt-4 inline-block text-primary hover:underline">Read article</Link>
                    </article>
                )) : <p className="text-muted">No public posts yet.</p>}
            </div>
        </main>
    );
}

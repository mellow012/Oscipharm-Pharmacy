import Link from "next/link";
import Image from "next/image";
import { getPublishedNews } from "@/features/news/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
    const posts = await getPublishedNews();

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <nav className="flex items-center justify-between gap-4 border-b border-border pb-5">
                <Link href="/" aria-label="OsciPharm home">
                    <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={154} height={62} className="h-14 w-auto object-contain" priority />
                </Link>

                <div className="flex flex-1 items-center justify-center">
                    <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                        <Link href="/catalog" className="transition hover:text-primary">Catalog</Link>
                        <Link href="/news" className="transition hover:text-primary">News</Link>
                    </div>
                </div>

                <Link href="/login" className="border-b border-warn pb-1 font-mono text-xs uppercase tracking-[0.12em] text-muted transition hover:text-primary">Staff sign in</Link>
            </nav>

            <header className="mb-8 border-b border-border pb-6 pt-8">
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

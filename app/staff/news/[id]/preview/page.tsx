import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { NewsPostActions } from "@/features/news/components/NewsPostActions";
import { getNewsPostForActor } from "@/features/news/lib/news-service";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBlantyreDateTime } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function StaffNewsPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "news:manage")) redirect("/unauthorized");
    const { id } = await params;
    const post = await getNewsPostForActor(session.user.id, id);
    if (!post) notFound();

    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-8">
            <StaffHeader />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
                <p className={post.status === "PREVIEW" ? "font-mono text-sm uppercase text-warn" : "font-mono text-sm uppercase text-primary"}>
                    {post.status === "PREVIEW" ? "Preview - not public" : "Live"}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/staff/news/${post.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                    <NewsPostActions postId={post.id} status={post.status} />
                    <Link href="/staff/news" className="text-sm text-muted hover:text-primary">Back</Link>
                </div>
            </div>
            <article className="py-7">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">{post.type === "EVENT" ? "Event" : "News"}</p>
                <h1 className="mt-3 text-4xl text-ink">{post.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
                    <span>{formatBlantyreDateTime(post.publishedAt)}</span>
                    <span>By {post.createdBy.name}</span>
                </div>
                {post.type === "EVENT" ? (
                    <dl className="mt-5 grid gap-2 border-y border-border py-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted">Starts · Malawi time (CAT)</dt><dd className="mt-1 text-ink">{post.eventStartsAt ? formatBlantyreDateTime(post.eventStartsAt) : "Date to be announced"}</dd></div>
                        {post.eventEndsAt ? <div><dt className="text-muted">Ends · Malawi time (CAT)</dt><dd className="mt-1 text-ink">{formatBlantyreDateTime(post.eventEndsAt)}</dd></div> : null}
                        {post.eventLocation ? <div><dt className="text-muted">Location</dt><dd className="mt-1 text-ink">{post.eventLocation}</dd></div> : null}
                    </dl>
                ) : null}
                {post.excerpt ? <p className="mt-5 text-lg text-muted">{post.excerpt}</p> : null}
                <div className="mt-6 whitespace-pre-wrap text-base leading-7 text-ink">{post.body}</div>
            </article>
        </main>
    );
}
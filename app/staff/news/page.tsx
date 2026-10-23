import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { NewsPostActions } from "@/features/news/components/NewsPostActions";
import { listNewsForActor } from "@/features/news/lib/news-service";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBlantyreDateTime } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function StaffNewsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "news:manage")) redirect("/unauthorized");

    const result = await listNewsForActor(session.user.id);
    if (!result.ok) redirect("/unauthorized");

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <StaffHeader />
            <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border py-7">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Staff workspace</p>
                    <h1 className="mt-2 text-3xl text-ink">News and events</h1>
                    {session.user.role === "BRANCH_MANAGER" ? <p className="mt-2 text-sm text-muted">You see and manage your own posts.</p> : null}
                </div>
                <Link href="/staff/news/new" className="bg-primary px-4 py-2 font-medium text-white">New post</Link>
            </header>

            <div className="divide-y divide-border">
                {result.data.map((post) => (
                    <article key={post.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase">
                                <span className="border border-border px-2 py-1 text-muted">{post.type}</span>
                                <span className={post.status === "PUBLISHED" ? "border border-primary px-2 py-1 text-primary" : "border border-warn px-2 py-1 text-warn"}>{post.status}</span>
                            </div>
                            <h2 className="mt-2 text-xl text-ink">{post.title}</h2>
                            <p className="mt-1 text-sm text-muted">
                                {post.type === "EVENT" && post.eventStartsAt ? "Starts " : post.status === "PUBLISHED" ? "Published " : "Created "}
                                {formatBlantyreDateTime(post.type === "EVENT" && post.eventStartsAt
                                    ? post.eventStartsAt
                                    : post.status === "PUBLISHED" ? post.publishedAt : post.createdAt)}
                                {session.user.role === "ADMIN" ? ` · By ${post.createdBy.name}` : ""}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link href={`/staff/news/${post.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                            <Link href={`/staff/news/${post.id}/preview`} className="text-sm text-primary hover:underline">Preview</Link>
                            <NewsPostActions postId={post.id} status={post.status} />
                        </div>
                    </article>
                ))}
                {!result.data.length ? <p className="py-8 text-sm text-muted">No posts yet.</p> : null}
            </div>
        </main>
    );
}
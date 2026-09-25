import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getNewsForAdmin } from "@/features/news/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "news:manage")) redirect("/unauthorized");

    const posts = await getNewsForAdmin();

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <header className="mb-6 flex items-center justify-between border-b border-border pb-6">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Admin</p>
                    <h1 className="mt-2 text-3xl text-ink">News management</h1>
                </div>
            </header>

            <div className="space-y-4">
                {posts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between gap-4 rounded border border-border bg-surface p-4">
                        <div>
                            <h2 className="text-xl text-ink">{post.title}</h2>
                            <p className="mt-1 text-sm text-muted">By {post.createdBy.name}</p>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <a href={`/news/${post.slug}`} className="text-primary">View</a>
                            <span className="text-muted">|</span>
                            <span className="text-muted">Edit</span>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

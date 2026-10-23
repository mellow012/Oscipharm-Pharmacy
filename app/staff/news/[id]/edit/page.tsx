import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { NewsForm } from "@/features/news/components/NewsForm";
import { NewsGalleryEditor } from "@/features/news/components/NewsGalleryEditor";
import { getNewsPostForActor } from "@/features/news/lib/news-service";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBlantyreInputValue } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function EditStaffNewsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "news:manage")) redirect("/unauthorized");
    const { id } = await params;
    const post = await getNewsPostForActor(session.user.id, id);
    if (!post) notFound();

    return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-8">
            <StaffHeader />
            <header className="border-b border-border py-7">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">News and events</p>
                <h1 className="mt-2 text-3xl text-ink">Edit post</h1>
            </header>
            <section className="py-7">
                <NewsForm
                    typeLocked
                    initial={{
                        id: post.id,
                        title: post.title,
                        type: post.type,
                        excerpt: post.excerpt,
                        body: post.body,
                        eventStartsAt: post.eventStartsAt ? formatBlantyreInputValue(post.eventStartsAt) : "",
                        eventEndsAt: post.eventEndsAt ? formatBlantyreInputValue(post.eventEndsAt) : "",
                        eventLocation: post.eventLocation,
                    }}
                />
                <NewsGalleryEditor
                    postId={post.id}
                    images={post.images.map(({ id: imageId, url, altText, caption, sortOrder }) => ({ id: imageId, url, altText, caption, sortOrder }))}
                />
            </section>
        </main>
    );
}
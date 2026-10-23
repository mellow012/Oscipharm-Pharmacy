import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { NewsForm } from "@/features/news/components/NewsForm";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewStaffNewsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "news:manage")) redirect("/unauthorized");

    return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-8">
            <StaffHeader />
            <header className="border-b border-border py-7">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">News and events</p>
                <h1 className="mt-2 text-3xl text-ink">New post</h1>
            </header>
            <section className="py-7">
                <NewsForm initial={{ title: "", type: "NEWS", excerpt: null, body: "", eventStartsAt: "", eventEndsAt: "", eventLocation: null }} />
            </section>
        </main>
    );
}
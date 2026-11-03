import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/features/auth/components/AcceptInvitationForm";

export const metadata: Metadata = {
    referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
            <section className="w-full border border-border bg-surface p-8 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                <h1 className="mb-2 text-4xl text-ink">Accept invitation</h1>
                <p className="mb-8 text-muted">Create your staff account to get started.</p>
                <AcceptInvitationForm token={token} />
            </section>
        </main>
    );
}
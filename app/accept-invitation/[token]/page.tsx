import type { Metadata } from "next";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { AcceptInvitationForm } from "@/features/auth/components/AcceptInvitationForm";

export const metadata: Metadata = {
    referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    return (
        <AuthPageShell title="Accept invitation" description="Create your OsciPharm staff account to get started.">
            <AcceptInvitationForm token={token} />
        </AuthPageShell>
    );
}
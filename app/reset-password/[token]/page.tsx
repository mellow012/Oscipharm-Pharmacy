import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { getValidPasswordResetToken } from "@/features/auth/lib/password-reset";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

const INVALID_MESSAGE = "This reset link is invalid or expired. Request a new one and try again.";

export const metadata: Metadata = {
    referrer: "no-referrer",
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const validToken = await getValidPasswordResetToken(token);

    return (
        <AuthPageShell title="Choose a new password" description={validToken ? "Create a strong new password for your account." : undefined}>
            {validToken ? <ResetPasswordForm token={token} /> : (
                <div className="space-y-5">
                    <NoticeBanner tone="warning" title="This link can’t be used">{INVALID_MESSAGE}</NoticeBanner>
                    <Link href="/forgot-password" className="inline-flex min-h-11 items-center gap-2 font-label-md text-label-md text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        Request another reset link <ArrowRight aria-hidden="true" size={16} />
                    </Link>
                    <Link href="/login" className="flex min-h-11 items-center gap-2 font-label-md text-label-md text-on-surface-variant underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        <ArrowLeft aria-hidden="true" size={16} />Back to sign in
                    </Link>
                </div>
            )}
        </AuthPageShell>
    );
}
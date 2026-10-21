import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { getValidPasswordResetToken } from "@/features/auth/lib/password-reset";

const INVALID_MESSAGE = "This reset link is invalid or expired. Request a new one and try again.";

export const metadata: Metadata = {
    referrer: "no-referrer",
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const validToken = await getValidPasswordResetToken(token);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
            <section className="w-full border border-border bg-surface p-8 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                <h1 className="mb-2 text-4xl text-ink">Choose a new password</h1>
                {validToken ? (
                    <>
                        <p className="mb-8 text-muted">Create a strong new password for your account.</p>
                        <ResetPasswordForm token={token} />
                    </>
                ) : (
                    <>
                        <p className="mb-8 text-muted">{INVALID_MESSAGE}</p>
                        <Link href="/forgot-password" className="block text-center text-sm text-muted underline decoration-warn underline-offset-4 hover:text-primary">
                            Request another reset link
                        </Link>
                    </>
                )}
            </section>
        </main>
    );
}
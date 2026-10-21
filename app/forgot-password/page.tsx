import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
            <section className="w-full border border-border bg-surface p-8 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                <h1 className="mb-2 text-4xl text-ink">Forgot password</h1>
                <p className="mb-8 text-muted">Enter your email and we’ll send a secure link to reset your password.</p>
                <ForgotPasswordForm />
                <Link href="/login" className="mt-6 block text-center text-sm text-muted underline decoration-warn underline-offset-4 hover:text-primary">
                    Back to sign in
                </Link>
            </section>
        </main>
    );
}
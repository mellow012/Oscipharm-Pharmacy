import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
            <section className="w-full border border-border bg-surface p-8 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                <h1 className="mb-2 text-4xl text-ink">Welcome back</h1>
                <p className="mb-8 text-muted">Sign in to continue to your pharmacy workspace.</p>
                <LoginForm />
                <Link href="/" className="mt-6 block text-center text-sm text-muted underline decoration-warn underline-offset-4 hover:text-primary">
                    Back to OsciPharm
                </Link>
            </section>
        </main>
    );
}

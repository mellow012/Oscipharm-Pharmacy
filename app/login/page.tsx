import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default async function LoginPage() {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) redirect("/staff");

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
            <section className="w-full border border-border bg-surface p-8 shadow-sm">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                <h1 className="mb-2 text-4xl text-ink">Welcome back</h1>
                <p className="mb-8 text-muted">Sign in to continue to your pharmacy workspace.</p>
                <LoginForm />
                <div className="mt-5 text-center">
                    <Link href="/forgot-password" className="text-sm text-primary underline decoration-warn underline-offset-4 hover:text-ink">Forgot password?</Link>
                </div>
                <Link href="/" className="mt-6 block text-center text-sm text-muted underline decoration-warn underline-offset-4 hover:text-primary">
                    Back to OsciPharm
                </Link>
            </section>
        </main>
    );
}

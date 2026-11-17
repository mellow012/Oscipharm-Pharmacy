import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
    return (
        <AuthPageShell title="Forgot password" description="Enter your email and we’ll send a secure link to reset your password.">
            <ForgotPasswordForm />
            <Link href="/login" className="mt-5 inline-flex min-h-11 items-center gap-2 font-label-md text-label-md text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <ArrowLeft aria-hidden="true" size={16} />Back to sign in
            </Link>
        </AuthPageShell>
    );
}
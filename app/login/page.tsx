import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default async function LoginPage() {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) redirect("/staff");

    return (
        <AuthPageShell title="Welcome back" description="Sign in to continue to your pharmacy workspace.">
            <LoginForm />
        </AuthPageShell>
    );
}

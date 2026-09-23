"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const result = await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false,
        });

        if (result?.error) {
            setError("The email or password was not recognised.");
            setIsSubmitting(false);
            return;
        }

        router.push("/staff");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-fg">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
            </div>
            <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-fg">
                    Password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
            </div>
            {error ? (
                <p role="alert" className="border-l-4 border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
                    {error}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary px-4 py-3 font-semibold text-primary-fg transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"
            >
                {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
        </form>
    );
}

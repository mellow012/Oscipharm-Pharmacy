"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ token: initialToken }: { token: string }) {
    const router = useRouter();
    const [token] = useState(initialToken);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        window.history.replaceState(null, "", "/reset-password");
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (!token) {
            setError("This reset link is missing a token.");
            setIsSubmitting(false);
            return;
        }

        if (password.length < 10 || new TextEncoder().encode(password).length > 72) {
            setError("Use a password of at least 10 characters and no more than 72 UTF-8 bytes.");
            setIsSubmitting(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            setIsSubmitting(false);
            return;
        }

        const response = await fetch("/api/password-reset/redeem", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, password }),
        });

        try {
            const payload = (await response.json().catch(() => ({}))) as { message?: string };
            if (!response.ok) {
                setError(payload.message ?? "This reset link is invalid or expired. Request a new one and try again.");
                return;
            }
            setSuccess(payload.message ?? "Password updated. You can now sign in.");
            setTimeout(() => router.push("/login"), 1500);
        } catch {
            setError("This reset link is invalid or expired. Request a new one and try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-fg">
                    New password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-fg">
                    Confirm new password
                </label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {error ? (
                <p role="alert" className="border-l-4 border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
                    {error}
                </p>
            ) : null}

            {success ? (
                <p className="border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm text-ink">{success}</p>
            ) : null}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary px-4 py-3 font-semibold text-primary-fg transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"
            >
                {isSubmitting ? "Updating password..." : "Update password"}
            </button>
        </form>
    );
}
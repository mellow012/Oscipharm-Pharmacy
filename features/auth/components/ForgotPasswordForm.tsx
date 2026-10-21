"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const form = event.currentTarget;

        const response = await fetch("/api/password-reset/request", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        try {
            const payload = (await response.json().catch(() => ({}))) as { message?: string };
            setMessage(payload.message ?? "If an account exists for that email, a reset link has been sent.");
            form.reset();
        } catch {
            setMessage("If an account exists for that email, a reset link has been sent.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-fg">
                    Email address
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

            {message ? (
                <p className="border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm text-ink">{message}</p>
            ) : null}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary px-4 py-3 font-semibold text-primary-fg transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"
            >
                {isSubmitting ? "Sending link..." : "Send reset link"}
            </button>
        </form>
    );
}
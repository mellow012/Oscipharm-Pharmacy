"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export function AcceptInvitationForm({ token: initialToken }: { token: string }) {
    const [token] = useState(initialToken);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        window.history.replaceState(null, "", "/accept-invitation");
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (!token) {
            setError("This invitation link is missing a token.");
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

        try {
            const response = await fetch("/api/invitations/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name, password }),
            });
            const payload = (await response.json().catch(() => ({}))) as { message?: string };
            if (!response.ok) {
                setError(payload.message ?? "This invitation link is invalid or expired. Request a new invitation from your administrator.");
                return;
            }
            setCreated(true);
        } catch {
            setError("Something went wrong. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (created) {
        return (
            <div className="space-y-4">
                <p className="border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm text-ink">Account created</p>
                <Link href="/login" className="block text-center text-sm text-muted underline decoration-warn underline-offset-4 hover:text-primary">Go to sign in</Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-fg">Full name</label>
                <input id="name" name="name" type="text" autoComplete="name" required maxLength={120} className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-fg">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-fg">Confirm password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            {error ? <p role="alert" className="border-l-4 border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p> : null}
            <button type="submit" disabled={isSubmitting} className="w-full bg-primary px-4 py-3 font-semibold text-primary-fg transition hover:bg-ink disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Creating account..." : "Create account"}</button>
        </form>
    );
}
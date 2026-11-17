"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthErrorSummary } from "@/features/auth/components/AuthErrorSummary";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

export function ForgotPasswordForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<string | undefined>();

    function handleInvalid(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFieldError(event.currentTarget.querySelector<HTMLInputElement>("#email")?.validity.valueMissing ? "Enter your email address." : "Enter a valid email address.");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const form = event.currentTarget;

        try {
            const response = await fetch("/api/password-reset/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const payload = (await response.json().catch(() => ({}))) as { message?: string };
            setMessage(payload.message ?? "If an account exists for that email, a reset link has been sent.");
            form.reset();
        } catch {
            setError("Something went wrong. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} onInvalidCapture={handleInvalid} className="space-y-5">
            <AuthErrorSummary message={error} fieldErrors={{ email: fieldError }} />
            <FormField id="email" label="Email address" required helperText="We’ll respond with the same message whether or not an account matches." error={fieldError}>
                {(props) => <FormInput {...props} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} className={`${props.className} min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`} onChange={() => setFieldError(undefined)} />}
            </FormField>

            {message ? <NoticeBanner tone="info">{message}</NoticeBanner> : null}

            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-4 py-3 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
            >
                {isSubmitting ? "Sending link..." : "Send reset link"}
                <ArrowRight aria-hidden="true" size={17} />
            </button>
        </form>
    );
}
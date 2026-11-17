"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthErrorSummary } from "@/features/auth/components/AuthErrorSummary";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { isValidNewPassword } from "@/lib/password";

export function ResetPasswordForm({ token: initialToken }: { token: string }) {
    const router = useRouter();
    const [token] = useState(initialToken);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        window.history.replaceState(null, "", "/reset-password");
    }, []);

    function handleInvalid(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const field = event.target as HTMLInputElement;
        const message = field.validity.valueMissing ? "This field is required." : "Check this field and try again.";
        setFieldErrors((current) => ({ ...current, [field.id]: message }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setFieldErrors({});
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const submittedPassword = String(formData.get("password") ?? "");
        const submittedConfirmation = String(formData.get("confirmPassword") ?? "");

        if (!token) {
            setError("This reset link is missing a token.");
            setIsSubmitting(false);
            return;
        }

        if (!isValidNewPassword(submittedPassword)) {
            setError("Use a password of at least 10 characters and no more than 72 UTF-8 bytes.");
            setFieldErrors({ password: "Use a password of at least 10 characters and no more than 72 UTF-8 bytes." });
            setIsSubmitting(false);
            return;
        }

        if (submittedPassword !== submittedConfirmation) {
            setError("The passwords do not match.");
            setFieldErrors({ confirmPassword: "The passwords do not match." });
            setIsSubmitting(false);
            return;
        }

        const response = await fetch("/api/password-reset/redeem", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, password: submittedPassword }),
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
        <form onSubmit={handleSubmit} onInvalidCapture={handleInvalid} className="space-y-5">
            <AuthErrorSummary message={error} fieldErrors={fieldErrors} />
            <PasswordField id="password" label="New password" value={password} onChange={setPassword} onValueChange={() => setFieldErrors((current) => ({ ...current, password: "" }))} error={fieldErrors.password} newPassword />
            <PasswordField id="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} onValueChange={() => setFieldErrors((current) => ({ ...current, confirmPassword: "" }))} error={fieldErrors.confirmPassword} newPassword showRules={false} />

            {success ? <NoticeBanner tone="info">{success}</NoticeBanner> : null}

            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-4 py-3 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
            >
                {isSubmitting ? "Updating password..." : "Update password"}
                <ArrowRight aria-hidden="true" size={17} />
            </button>
            {error?.includes("invalid or expired") ? <Link href="/forgot-password" className="inline-flex min-h-11 items-center gap-2 font-label-md text-label-md text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Request a new reset link <ArrowRight aria-hidden="true" size={16} /></Link> : null}
        </form>
    );
}
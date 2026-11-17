"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthErrorSummary } from "@/features/auth/components/AuthErrorSummary";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { isValidNewPassword } from "@/lib/password";

export function AcceptInvitationForm({ token: initialToken }: { token: string }) {
    const [token] = useState(initialToken);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    function handleInvalid(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const field = event.target as HTMLInputElement;
        const message = field.validity.valueMissing ? "This field is required." : "Check this field and try again.";
        setFieldErrors((current) => ({ ...current, [field.id]: message }));
    }

    useEffect(() => {
        window.history.replaceState(null, "", "/accept-invitation");
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setFieldErrors({});
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const submittedName = String(formData.get("name") ?? "").trim();
        const submittedPassword = String(formData.get("password") ?? "");
        const submittedConfirmation = String(formData.get("confirmPassword") ?? "");

        if (!token) {
            setError("This invitation link is missing a token.");
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

        try {
            const response = await fetch("/api/invitations/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name: submittedName, password: submittedPassword }),
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
                <NoticeBanner tone="info" title="Account created">Your OsciPharm staff account is ready.</NoticeBanner>
                <Link href="/login" className="inline-flex min-h-11 items-center gap-2 font-label-md text-label-md text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Go to sign in <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} onInvalidCapture={handleInvalid} className="space-y-5">
            <AuthErrorSummary message={error} fieldErrors={fieldErrors} />
            <FormField id="name" label="Full name" required helperText="Enter the name you want on your staff account.">
                {(props) => <FormInput {...props} name="name" autoComplete="name" maxLength={120} value={name} className={`${props.className} min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`} onChange={(event) => setName(event.target.value)} />}
            </FormField>
            <PasswordField id="password" label="Password" value={password} onChange={setPassword} onValueChange={() => setFieldErrors((current) => ({ ...current, password: "" }))} error={fieldErrors.password} newPassword />
            <PasswordField id="confirmPassword" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} onValueChange={() => setFieldErrors((current) => ({ ...current, confirmPassword: "" }))} error={fieldErrors.confirmPassword} newPassword showRules={false} />
            {error?.includes("invitation link is invalid or expired") ? <p className="text-body-sm text-on-surface-variant">Ask your administrator to send you a new invitation.</p> : null}
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-4 py-3 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? "Creating account..." : "Create account"}<ArrowRight aria-hidden="true" size={17} />
            </button>
        </form>
    );
}
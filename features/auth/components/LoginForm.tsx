"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthErrorSummary } from "@/features/auth/components/AuthErrorSummary";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { FormField, FormInput } from "@/features/shared/components/FormField";

export function LoginForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    function handleInvalid(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const field = event.target as HTMLInputElement;
        const message = field.validity.valueMissing ? "This field is required." : "Enter a valid email address.";
        setFieldErrors((current) => ({ ...current, [field.id]: message }));
    }

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
        <form onSubmit={handleSubmit} onInvalidCapture={handleInvalid} className="space-y-5">
            <AuthErrorSummary message={error} fieldErrors={fieldErrors} />
            <FormField id="email" label="Email" required helperText="Use the email address linked to your staff account." error={fieldErrors.email}>
                {(props) => <FormInput {...props} name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} className={`${props.className} min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`} onChange={() => setFieldErrors((current) => ({ ...current, email: "" }))} />}
            </FormField>
            <PasswordField id="password" label="Password" required error={fieldErrors.password} onValueChange={() => setFieldErrors((current) => ({ ...current, password: "" }))} />
            <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-4 py-3 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
            >
                {isSubmitting ? "Signing in..." : "Sign in"}
                <ArrowRight aria-hidden="true" size={17} />
            </button>
        </form>
    );
}

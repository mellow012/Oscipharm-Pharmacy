"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { applyForMembership, type MembershipActionState } from "@/features/membership/lib/actions";
import { membershipTopics } from "@/features/membership/types";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

const initialState: MembershipActionState = {};

type TextField = "fullName" | "phone" | "email" | "workPlace" | "currentAddress" | "village" | "otherHealthCondition";

function textValueFor(state: MembershipActionState, key: TextField): string | undefined {
    return state.values?.[key] as string | undefined;
}

function focusRing(className: string) {
    return `${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`;
}

export function MembershipForm() {
    const [state, formAction, isPending] = useActionState(applyForMembership, initialState);
    const summaryRef = useRef<HTMLDivElement>(null);
    const errors = state.fieldErrors ?? {};
    const errorEntries = Object.entries(errors).filter((entry): entry is [string, string] => Boolean(entry[1]));

    useEffect(() => {
        if (errorEntries.length) summaryRef.current?.focus();
    }, [errorEntries.length, state]);

    if (state.success) {
        return (
            <section className="space-y-6" aria-labelledby="membership-success-title">
                <NoticeBanner tone="info" title="Request received">
                    <span className="inline-flex items-start gap-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />Thank you, we have received your request. Our team will contact you.</span>
                </NoticeBanner>
                <Link href="/catalog" className="inline-flex min-h-11 items-center gap-2 font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    Browse the catalog <ArrowRight aria-hidden="true" size={17} />
                </Link>
                <h2 id="membership-success-title" className="sr-only">Membership request received</h2>
            </section>
        );
    }

    return (
        <form action={formAction} noValidate className="space-y-8">
            {errorEntries.length ? (
                <div ref={summaryRef} tabIndex={-1} aria-live="assertive" aria-labelledby="membership-error-title" className="border-l-4 border-status-danger bg-status-danger-bg px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-danger">
                    <h3 id="membership-error-title" className="font-label-md text-label-md text-status-danger-text">Please review these fields</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-body-sm text-status-danger-text">
                        {errorEntries.map(([field, message]) => (
                            <li key={field}><a href={`#${field}`} className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{message}</a></li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {state.formError ? <NoticeBanner tone="danger">{state.formError}</NoticeBanner> : null}

            <div className="grid gap-5 md:grid-cols-2">
                <FormField id="fullName" label="Full name" required error={errors.fullName}>
                    {(props) => <FormInput {...props} name="fullName" autoComplete="name" maxLength={100} defaultValue={textValueFor(state, "fullName")} className={focusRing(props.className)} />}
                </FormField>
                <FormField id="phone" label="Phone number" required helperText="Use 7 to 20 characters, including digits and common phone punctuation." error={errors.phone}>
                    {(props) => <FormInput {...props} name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} defaultValue={textValueFor(state, "phone")} className={focusRing(props.className)} />}
                </FormField>
                <FormField id="email" label="Email address (optional)" helperText="Required only when Email is your preferred contact method." error={errors.email}>
                    {(props) => <FormInput {...props} name="email" type="email" autoComplete="email" maxLength={254} defaultValue={textValueFor(state, "email")} className={focusRing(props.className)} />}
                </FormField>
                <FormField id="workPlace" label="Workplace" required error={errors.workPlace}>
                    {(props) => <FormInput {...props} name="workPlace" autoComplete="organization" maxLength={120} defaultValue={textValueFor(state, "workPlace")} className={focusRing(props.className)} />}
                </FormField>
                <FormField id="currentAddress" label="Current residential address" required helperText="Where you currently live." error={errors.currentAddress}>
                    {(props) => <FormInput {...props} name="currentAddress" autoComplete="street-address" maxLength={200} defaultValue={textValueFor(state, "currentAddress")} className={focusRing(props.className)} />}
                </FormField>
                <FormField id="village" label="Village" required error={errors.village}>
                    {(props) => <FormInput {...props} name="village" maxLength={120} defaultValue={textValueFor(state, "village")} className={focusRing(props.className)} />}
                </FormField>
            </div>

            <fieldset id="healthConditions" tabIndex={-1} aria-invalid={errors.healthConditions ? true : undefined} aria-describedby={errors.healthConditions ? "healthConditions-error" : "healthConditions-help"} className="min-w-0 border-y border-outline-variant py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <legend className="font-display text-headline-sm text-ink">Health conditions <span className="font-label-sm text-status-danger-text">*</span></legend>
                <p id="healthConditions-help" className="mt-1 text-body-sm text-on-surface-variant">Select one or more conditions relevant to your request, or enter another illness.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {membershipTopics.map((topic) => (
                        <label key={topic.value} className="flex min-h-11 items-center gap-3 border-b border-outline-variant py-2 text-body-sm text-on-surface">
                            <input type="checkbox" name="healthConditions" value={topic.value} defaultChecked={state.values?.healthConditions.includes(topic.value)} className="size-5 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
                            {topic.label}
                        </label>
                    ))}
                </div>
                {errors.healthConditions ? <p id="healthConditions-error" className="mt-2 text-body-sm text-status-danger-text">{errors.healthConditions}</p> : null}
                <div className="mt-5">
                    <FormField id="otherHealthCondition" label="Other illness (optional)" error={errors.otherHealthCondition}>
                        {(props) => <FormInput {...props} name="otherHealthCondition" maxLength={120} placeholder="Enter an illness not listed above" defaultValue={textValueFor(state, "otherHealthCondition")} className={focusRing(props.className)} />}
                    </FormField>
                </div>
            </fieldset>

            <fieldset id="contactPreference" tabIndex={-1} aria-invalid={errors.contactPreference ? true : undefined} aria-describedby={errors.contactPreference ? "contactPreference-error" : undefined} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <legend className="font-display text-headline-sm text-ink">Preferred contact <span className="font-label-sm text-status-danger-text">*</span></legend>
                <div className="mt-2 flex flex-wrap gap-3">
                    {(["PHONE", "EMAIL"] as const).map((preference) => (
                        <label key={preference} className="flex min-h-11 items-center gap-3 border border-outline-variant px-4 py-2 text-body-sm text-on-surface">
                            <input type="radio" name="contactPreference" value={preference} defaultChecked={state.values?.contactPreference ? state.values.contactPreference === preference : preference === "PHONE"} className="size-5 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
                            {preference === "PHONE" ? "Phone" : "Email"}
                        </label>
                    ))}
                </div>
                {errors.contactPreference ? <p id="contactPreference-error" className="mt-2 text-body-sm text-status-danger-text">{errors.contactPreference}</p> : null}
            </fieldset>

            <FormField id="consent" label="I agree that OsciPharm staff at its branches, including counter staff, may see my contact details and selected health conditions to review my request, dispense medicines and apply discounts. I will not submit medical records." required error={errors.consent}>
                {(props) => <input {...props} type="checkbox" name="consent" value="on" defaultChecked={state.values?.consent} className="mt-2 size-5 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />}
            </FormField>

            <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" type="text" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <button type="submit" disabled={isPending} className="inline-flex min-h-12 w-full items-center justify-center gap-3 bg-primary px-6 py-3 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                {isPending ? "Sending request..." : "Request membership"}
                <ArrowRight aria-hidden="true" size={18} />
            </button>
        </form>
    );
}

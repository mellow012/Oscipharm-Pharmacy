"use client";

import { useActionState } from "react";
import { applyForMembership, type MembershipActionState } from "@/features/membership/lib/actions";
import { membershipTopics } from "@/features/membership/types";

const initialState: MembershipActionState = {};

export function MembershipForm() {
    const [state, formAction, isPending] = useActionState(applyForMembership, initialState);

    return (
        <form action={formAction} className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-fg">Full name</label>
                    <input id="fullName" name="fullName" autoComplete="name" required maxLength={100} className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label htmlFor="phone" className="mb-2 block text-sm font-medium text-fg">Phone number</label>
                    <input id="phone" name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-fg">Email address <span className="text-muted">(optional)</span></label>
                    <input id="email" name="email" type="email" autoComplete="email" maxLength={254} className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label htmlFor="workPlace" className="mb-2 block text-sm font-medium text-fg">Workplace</label>
                    <input id="workPlace" name="workPlace" autoComplete="organization" required maxLength={120} className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="currentAddress" className="mb-2 block text-sm font-medium text-fg">Current residential address</label>
                    <input id="currentAddress" name="currentAddress" autoComplete="street-address" required maxLength={200} placeholder="Where you currently live" className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                    <label htmlFor="village" className="mb-2 block text-sm font-medium text-fg">Village</label>
                    <input id="village" name="village" required maxLength={120} className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
            </div>

            <fieldset>
                <legend className="mb-1 text-lg font-semibold text-ink">Health condition</legend>
                <p className="mb-4 text-sm text-muted">Select the condition or conditions relevant to your membership.</p>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {membershipTopics.map((topic) => (
                        <label key={topic.value} className="flex min-h-12 items-center gap-3 border-b border-border py-2 text-sm text-fg">
                            <input type="checkbox" name="healthConditions" value={topic.value} className="size-4 accent-primary" />
                            {topic.label}
                        </label>
                    ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">Selected conditions are recorded for membership review. Please do not include medicines, records, or other medical details.</p>
                <div className="mt-5">
                    <label htmlFor="otherHealthCondition" className="mb-2 block text-sm font-medium text-fg">Other illness <span className="text-muted">(optional)</span></label>
                    <input id="otherHealthCondition" name="otherHealthCondition" maxLength={120} placeholder="Enter an illness not listed above" className="w-full border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-3 text-lg font-semibold text-ink">Preferred contact</legend>
                <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm text-fg"><input type="radio" name="contactPreference" value="PHONE" defaultChecked className="size-4 accent-primary" /> Phone</label>
                    <label className="flex items-center gap-2 text-sm text-fg"><input type="radio" name="contactPreference" value="EMAIL" className="size-4 accent-primary" /> Email</label>
                </div>
            </fieldset>

            <label className="flex items-start gap-3 border-y border-border py-4 text-sm leading-6 text-fg">
                <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0 accent-primary" />
                <span>I confirm these details are accurate and agree that OsciPharm membership staff may use my contact details and selected health conditions to review my membership and contact me about membership information. Updates are general and are not medical advice.</span>
            </label>

            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px" />

            {state.error ? <p role="alert" className="border-l-4 border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{state.error}</p> : null}
            {state.success ? <p role="status" className="border-l-4 border-primary bg-chip px-4 py-3 text-sm text-primary">{state.success}</p> : null}

            <button type="submit" disabled={isPending || Boolean(state.success)} className="inline-flex min-h-12 items-center gap-3 bg-primary px-6 py-3 font-semibold text-primary-fg transition hover:bg-ink disabled:cursor-wait disabled:opacity-60">
                {isPending ? "Sending request..." : "Request membership"}
                <span aria-hidden="true">-&gt;</span>
            </button>
        </form>
    );
}

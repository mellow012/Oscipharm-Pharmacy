import type { Role } from "@prisma/client";
import { membershipDiscountPercent, membershipTierLabels } from "@/features/membership/lib/policy";
import { membershipTopicLabels, type MembershipTopic } from "@/features/membership/types";
import type { MemberLookupRow } from "@/features/membership/lib/member-lookup-service";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { PageHeader } from "@/features/shared/components/PageHeader";

export function MemberLookup({ members, query, role }: { members: MemberLookupRow[]; query: string; role: Role }) {
    const searched = query.trim().length >= 2;

    return (
        <div className="mx-auto min-h-screen w-full min-w-0 max-w-6xl space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
            <PageHeader eyebrow="Member lookup" title="Members" description="Search member details for dispensing and applying discounts." />
            <NoticeBanner tone="info" title="Confidential member information">
                Member health details are confidential and for dispensing and applying discounts only.
            </NoticeBanner>

            <form method="get" action="/staff/members" className="flex min-w-0 flex-wrap items-end gap-space-md border-y border-outline-variant bg-surface-container-lowest px-space-md py-space-md">
                <div className="w-full max-w-xl">
                    <FormField id="member-search" label="Search by name or phone" helperText="Enter at least 2 characters.">
                        {(fieldProps) => <FormInput {...fieldProps} type="search" name="q" minLength={2} defaultValue={query} />}
                    </FormField>
                </div>
                <button type="submit" className="min-h-[42px] border border-primary bg-primary px-space-md font-label-md text-label-md text-on-primary hover:bg-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Search</button>
                {query ? <a href="/staff/members" className="min-h-[42px] inline-flex items-center text-primary underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Clear</a> : null}
            </form>

            {!searched ? (
                <p className="border-b border-outline-variant py-space-lg font-body-sm text-body-sm text-on-surface-variant">Enter at least 2 characters to search members.</p>
            ) : members.length ? (
                <ul className="divide-y divide-outline-variant border-b border-outline-variant">
                    {members.map((member) => (
                        <li key={`${member.phone}-${member.name}`} className="grid min-w-0 gap-space-md py-space-lg sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                            <div className="min-w-0">
                                <h2 className="break-words font-headline-sm text-headline-sm text-primary">{member.name}</h2>
                                <a href={`tel:${member.phone}`} className="mt-space-xs inline-block text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{member.phone}</a>
                                <p className="mt-space-sm font-label-sm text-label-sm text-on-surface-variant">Health conditions</p>
                                <p className="mt-space-xs break-words font-body-sm text-body-sm text-on-surface">
                                    {[...member.healthConditions.map((condition) => membershipTopicLabels[condition as MembershipTopic] ?? condition), ...(member.otherHealthCondition ? [member.otherHealthCondition] : [])].join(", ") || "None listed"}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-space-sm sm:justify-end">
                                {member.tier ? <StatusBadge tone="success">{role === "POS" ? `${member.tier === "CHRONIC_ILLNESS" ? "Chronic" : "General"} ${membershipDiscountPercent[member.tier]}% off` : `${membershipTierLabels[member.tier]} · ${membershipDiscountPercent[member.tier]}% off`}</StatusBadge> : null}
                                {role !== "POS" ? <StatusBadge tone={member.status === "ACTIVE" ? "success" : "neutral"}>{member.status.toLowerCase()}</StatusBadge> : null}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="border-b border-outline-variant py-space-lg font-body-sm text-body-sm text-on-surface-variant">No members match that search.</p>
            )}
        </div>
    );
}
import { MembershipStatus, MembershipTier } from "@prisma/client";
import { reviewMembershipApplication } from "@/features/membership/lib/actions";
import { membershipDiscountPercent, membershipTierLabels } from "@/features/membership/lib/policy";
import { membershipTopicLabels, type MembershipTopic } from "@/features/membership/types";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";

type Applications = Awaited<ReturnType<typeof import("@/features/membership/lib/queries").getMembershipApplications>>;

export function MembershipApplications({ applications }: { applications: Applications }) {
    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <StaffHeader />
            <header className="flex flex-col gap-4 border-b border-border py-10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-warn">Admin workspace</p>
                    <h1 className="text-4xl leading-tight text-ink">Membership requests</h1>
                    <p className="mt-2 text-sm text-muted">Approve eligible members and set the discount rate agreed by pharmacy policy.</p>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{applications.length} requests</span>
            </header>
            {applications.length ? (
                <ul className="divide-y divide-border border-b border-border">
                    {applications.map((application) => (
                        <li key={application.id} className="grid gap-5 py-6 md:grid-cols-[1fr_1fr_auto] md:items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-ink">{application.fullName}</h2>
                                <a href={`tel:${application.phone}`} className="mt-1 block text-sm text-primary hover:underline">{application.phone}</a>
                                {application.email ? <a href={`mailto:${application.email}`} className="mt-1 block text-sm text-muted hover:text-primary">{application.email}</a> : null}
                                <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">Preferred: {application.contactPreference.toLowerCase()}</p>
                            </div>
                            <div>
                                <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Health conditions</p>
                                {application.healthConditions.length ? <p className="mt-2 text-sm leading-6 text-fg">{application.healthConditions.map((topic) => membershipTopicLabels[topic as MembershipTopic] ?? topic).join(", ")}</p> : null}
                                {application.otherHealthCondition ? <p className="mt-1 text-sm leading-5 text-fg">Other: {application.otherHealthCondition}</p> : null}
                                <p className="mt-2 text-xs leading-5 text-muted">Workplace: {application.workPlace}<br />Address: {application.currentAddress}<br />Village: {application.village}</p>
                                <p className="mt-2 text-xs text-muted">Requested {application.createdAt.toLocaleDateString("en-MW")}</p>
                            </div>
                            <div className="flex flex-col gap-3 md:items-end">
                                <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
                                    {application.status === MembershipStatus.ACTIVE && application.discountTier
                                        ? `active · ${membershipTierLabels[application.discountTier]} · ${membershipDiscountPercent[application.discountTier]}%`
                                        : application.status.toLowerCase()}
                                </span>
                                {application.status !== MembershipStatus.REJECTED ? (
                                    <form action={reviewMembershipApplication} className="flex flex-wrap items-end gap-2">
                                        <input type="hidden" name="id" value={application.id} />
                                        <label className="text-xs text-muted">
                                            Membership tier
                                            <select name="discountTier" required defaultValue={application.discountTier ?? ""} className="mt-1 block min-w-52 border border-border bg-surface px-2 py-2 text-sm text-fg">
                                                <option value="" disabled>Choose a tier</option>
                                                <option value={MembershipTier.CHRONIC_ILLNESS}>Chronic illness (20%)</option>
                                                <option value={MembershipTier.GENERAL_SICKNESS}>General sickness (15%)</option>
                                            </select>
                                        </label>
                                        <button name="status" value="ACTIVE" type="submit" className="border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-chip">{application.status === MembershipStatus.ACTIVE ? "Update tier" : "Activate"}</button>
                                        {application.status === MembershipStatus.PENDING ? <button name="status" value="REJECTED" type="submit" formNoValidate className="border border-border px-3 py-2 text-sm text-muted transition hover:border-danger hover:text-danger">Decline</button> : null}
                                    </form>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="border-b border-border py-10 text-muted">No membership requests yet.</p>
            )}
        </main>
    );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MembershipForm } from "@/features/membership/components/MembershipForm";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";
import { getPublicBranches } from "@/features/catalog/lib/queries";

export const metadata: Metadata = {
    title: "Membership | OsciPharm",
    description: "Request OsciPharm membership and choose the pharmacy health topics you would like updates about.",
};

export default function MembershipPage() {
    return <MembershipPageContent />;
}

async function MembershipPageContent() {
    const branches = await getPublicBranches();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <header className="border-b border-outline-variant py-8 sm:py-10">
                <div>
                    <p className="font-eyebrow text-eyebrow uppercase text-secondary">OsciPharm membership</p>
                    <h1 className="mt-2 max-w-3xl font-display text-headline-xl text-primary">Request membership</h1>
                    <p className="mt-3 max-w-3xl text-body-md text-on-surface-variant">Request membership and let our team review your eligibility for applicable medication discounts.</p>
                </div>
            </header>
            <details className="mt-5 border-y border-outline-variant py-3 lg:hidden">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-label-md text-label-md text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    Your privacy and how information is used <ChevronDown aria-hidden="true" size={18} />
                </summary>
                <p className="pb-2 pt-3 text-body-sm leading-6 text-on-surface-variant">OsciPharm staff at its branches, including counter staff, may see your contact details and selected health conditions to review your request, dispense medicines and apply discounts. Do not submit medical records.</p>
            </details>
            <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-12 lg:py-9">
                <section aria-labelledby="membership-form-title" className="min-w-0 lg:order-2">
                    <h2 id="membership-form-title" className="mb-6 font-display text-headline-md text-ink">Your details</h2>
                    <MembershipForm />
                </section>
                <aside className="hidden h-fit border-l-2 border-primary bg-surface-container-low px-5 py-5 lg:order-1 lg:block">
                    <h2 className="font-display text-headline-sm text-ink">Your privacy matters</h2>
                    <p className="mt-3 text-body-sm leading-6 text-on-surface-variant">OsciPharm staff at its branches, including counter staff, may see your contact details and selected health conditions to review your request, dispense medicines and apply discounts. Do not submit medical records.</p>
                    <p className="mt-5 text-body-sm leading-6 text-on-surface-variant">Our team will review your request and contact you about applicable medication discounts.</p>
                    <Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-2 font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Back to home <ArrowRight aria-hidden="true" size={17} /></Link>
                </aside>
            </div>
            <PublicFooter branches={branches} />
        </main>
    );
}

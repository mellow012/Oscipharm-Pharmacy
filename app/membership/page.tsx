import type { Metadata } from "next";
import Link from "next/link";
import { MembershipForm } from "@/features/membership/components/MembershipForm";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export const metadata: Metadata = {
    title: "Membership | OsciPharm",
    description: "Request OsciPharm membership and choose the pharmacy health topics you would like updates about.",
};

export default function MembershipPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <header className="grid gap-8 border-b border-border py-10 sm:py-14 lg:grid-cols-[1fr_0.7fr] lg:items-end">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-warn">OsciPharm membership</p>
                    <h1 className="max-w-2xl text-5xl leading-[0.98] text-ink">Care updates, with you in mind.</h1>
                </div>
                <p className="max-w-xl text-base leading-7 text-muted">Share your contact and residence details, then select the health conditions relevant to your membership request. Our team will contact you about enrollment and applicable medication discounts.</p>
            </header>
            <div className="grid gap-10 py-10 lg:grid-cols-[0.65fr_1fr] lg:gap-16">
                <aside className="h-fit border-l-2 border-primary bg-chip px-5 py-5">
                    <h2 className="text-xl text-ink">Your privacy matters</h2>
                    <p className="mt-3 text-sm leading-6 text-muted">Membership staff use your contact and residence details and the health conditions you provide to review your request. Do not submit medical records or treatment details.</p>
                    <p className="mt-5 text-sm leading-6 text-muted">Discount eligibility, qualifying medicines, and the discount rate will be confirmed by our team before enrollment.</p>
                    <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-ink">Back to home <span aria-hidden="true">-&gt;</span></Link>
                </aside>
                <section aria-labelledby="membership-form-title">
                    <h2 id="membership-form-title" className="mb-6 text-2xl text-ink">Membership request</h2>
                    <MembershipForm />
                </section>
            </div>
        </main>
    );
}

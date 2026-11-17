import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

export default function UnauthorizedPage() {
    return (
        <AuthPageShell title="Access restricted" description="Your account does not have permission to view this area." eyebrow="Account access">
            <div className="space-y-5">
                <NoticeBanner tone="warning" title="You don’t have access"><span className="inline-flex items-start gap-2"><ShieldAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />Return to your staff home or OsciPharm’s public site.</span></NoticeBanner>
                <Link href="/staff" className="inline-flex min-h-12 items-center gap-2 bg-primary px-4 font-label-md text-label-md font-semibold text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Back to staff home <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
        </AuthPageShell>
    );
}
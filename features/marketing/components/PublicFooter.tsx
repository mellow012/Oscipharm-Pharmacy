import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import type { PublicBranch } from "@/features/catalog/lib/queries";
import { siteContact } from "@/lib/site-config";

function telHref(phone: string) {
    return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function httpsHref(website: string) {
    return `https://${website.replace(/^https?:\/\//i, "")}`;
}

export function PublicFooter({ branches }: { branches: PublicBranch[] }) {
    const websiteLabel = siteContact.website.replace(/^https?:\/\//i, "");

    return (
        <footer className="mt-10 border-t border-outline-variant pt-8 sm:mt-14 sm:pt-10">
            <div className="grid min-w-0 gap-8 pb-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
                <div className="min-w-0">
                    <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={126} height={50} className="h-10 w-auto object-contain object-left" />
                    <p className="mt-5 max-w-xs font-body-sm text-body-sm leading-6 text-on-surface-variant">Good Chemistry. Good Health. Everyday care, thoughtfully stocked.</p>
                </div>
                <section aria-labelledby="footer-branches-heading" className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                        <h2 id="footer-branches-heading" className="font-headline-md text-headline-md text-primary">Our branches</h2>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{String(branches.length).padStart(2, "0")} {branches.length === 1 ? "location" : "locations"}</span>
                    </div>
                    <ul className="divide-y divide-outline-variant border-y border-outline-variant">
                        {branches.map((branch) => (
                            <li key={branch.id} className="flex min-w-0 flex-col justify-between gap-1 py-2 sm:flex-row sm:items-center sm:gap-3">
                                <Link href={`/catalog?branch=${encodeURIComponent(branch.id)}#products`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                    <MapPin aria-hidden="true" size={17} className="shrink-0 text-secondary" />
                                    <span className="min-w-0 py-1">
                                        <span className="block break-words font-label-md text-label-md text-on-surface">{branch.name}</span>
                                        <span className="mt-1 block break-words text-body-sm text-on-surface-variant">{branch.location}</span>
                                    </span>
                                </Link>
                                {branch.contactNumber ? (
                                    <a href={telHref(branch.contactNumber)} className="inline-flex min-h-11 items-center gap-2 self-start font-label-sm text-label-sm text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:shrink-0">
                                        <Phone aria-hidden="true" size={15} />{branch.contactNumber}
                                    </a>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </section>
                <section aria-labelledby="footer-contact-heading" className="min-w-0">
                    <h2 id="footer-contact-heading" className="mb-3 font-eyebrow text-eyebrow uppercase text-secondary">Contact</h2>
                    <div className="flex min-w-0 flex-col items-start font-body-sm text-body-sm text-on-surface-variant">
                        {siteContact.phone ? <a href={telHref(siteContact.phone)} className="inline-flex min-h-11 max-w-full items-center break-all hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{siteContact.phoneDisplay || siteContact.phone}</a> : null}
                        {siteContact.email ? <a href={`mailto:${siteContact.email}`} className="inline-flex min-h-11 max-w-full items-center break-all hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{siteContact.email}</a> : null}
                        {siteContact.website ? <a href={httpsHref(siteContact.website)} className="inline-flex min-h-11 max-w-full items-center break-all hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{websiteLabel}</a> : null}
                    </div>
                </section>
            </div>
            <div className="border-t border-outline-variant py-5 font-label-sm text-label-sm text-on-surface-variant">OsciPharm / Good Chemistry. Good Health.</div>
        </footer>
    );
}
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import type { PublicBranch } from "@/features/catalog/lib/queries";

export function BranchDirectory({ branches }: { branches: PublicBranch[] }) {
    return (
        <section id="branches" aria-labelledby="branch-directory-heading" className="border-t border-outline-variant py-9 sm:py-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="font-eyebrow text-eyebrow uppercase text-secondary">Across Malawi</p>
                    <h2 id="branch-directory-heading" className="mt-2 font-display text-headline-md text-primary">Find a branch</h2>
                </div>
                <p className="max-w-sm text-body-sm text-on-surface-variant">Availability can change, so call your branch to confirm.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
                {branches.map((branch) => (
                    <li key={branch.id}>
                        <Link href={`/catalog?branch=${encodeURIComponent(branch.id)}#products`} className="group flex min-h-[124px] flex-col justify-between border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        <div className="flex items-start gap-3">
                            <MapPin aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-secondary" />
                            <div>
                                <h3 className="font-label-md text-label-md text-on-surface">{branch.name}</h3>
                                <p className="mt-1 text-body-sm text-on-surface-variant">{branch.location}</p>
                            </div>
                        </div>
                        <span className="mt-3 inline-flex min-h-11 items-center gap-2 self-start font-label-md text-label-md font-semibold text-primary group-hover:underline">
                            <Phone aria-hidden="true" size={16} />{branch.contactNumber ? `Call ${branch.name}` : `View ${branch.name}`}
                        </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
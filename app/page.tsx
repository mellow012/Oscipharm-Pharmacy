import Link from "next/link";
import Image from "next/image";
import { ArrowRight, HeartPulse, MapPinned, ShieldCheck } from "lucide-react";
import { ProductBrowser } from "@/features/catalog/components/ProductBrowser";
import { getCatalogBrowserData } from "@/features/catalog/lib/queries";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";
import { NewsCard } from "@/features/news/components/NewsCard";
import { getPublicFeed } from "@/features/news/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const { categories, products, branches } = await getCatalogBrowserData();
    const now = new Date();
    const { items: latestUpdates } = await getPublicFeed("all", now);

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />

            <section className="mt-6 overflow-hidden rounded-[28px] border border-outline-variant bg-surface shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
                    <div className="flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-10 lg:py-12">
                        <p className="font-eyebrow text-eyebrow uppercase text-secondary">Trusted everyday care</p>
                        <h1 className="mt-3 max-w-xl font-display text-headline-xl text-primary">Good chemistry. Good health.</h1>
                        <p className="mt-4 max-w-lg text-body-lg text-on-surface-variant">
                            Everyday medicines, wellness essentials and community updates from your local OsciPharm network.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link href="/catalog" className="inline-flex min-h-11 items-center gap-2 bg-primary px-5 font-label-md text-label-md text-primary-fg transition hover:bg-ink">
                                Browse the catalog <ArrowRight aria-hidden="true" size={16} />
                            </Link>
                            <Link href="/news" className="inline-flex min-h-11 items-center gap-2 border border-outline-variant bg-surface-container-lowest px-5 font-label-md text-label-md text-on-surface transition hover:border-primary hover:text-primary">
                                See updates
                            </Link>
                        </div>
                    </div>
                    <div className="relative min-h-[280px] bg-surface-container-low">
                        <Image
                            src="/op/hero-image.png"
                            alt="OsciPharm Pharmacy hero artwork showing a pharmacist serving a customer"
                            width={2048}
                            height={1152}
                            priority
                            sizes="(max-width: 640px) 100vw, 680px"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
            </section>

            <section className="grid gap-4 py-8 md:grid-cols-3">
                {[
                    { icon: HeartPulse, title: "Everyday health", body: "Pharmacy essentials and wellness items arranged for simple, fast shopping." },
                    { icon: MapPinned, title: "Branch support", body: "Find stock and contact details across the local branch network in one place." },
                    { icon: ShieldCheck, title: "Trusted care", body: "Reliable, human guidance from the pharmacy team you know and can call." },
                ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon aria-hidden="true" size={18} />
                        </div>
                        <h2 className="mt-4 font-display text-headline-sm text-primary">{title}</h2>
                        <p className="mt-2 text-body-md text-on-surface-variant">{body}</p>
                    </div>
                ))}
            </section>

            <ProductBrowser categories={categories} products={products} branches={branches} />

            {latestUpdates.length ? (
                <section aria-labelledby="latest-updates-heading" className="border-t border-outline-variant py-8 sm:py-10">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="font-eyebrow text-eyebrow uppercase text-secondary">Latest updates</p>
                            <h2 id="latest-updates-heading" className="mt-2 font-display text-headline-md text-primary">News and events</h2>
                        </div>
                        <Link href="/news" className="inline-flex min-h-11 items-center font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline">
                            View all updates
                        </Link>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {latestUpdates.slice(0, 3).map((post) => <NewsCard key={post.id} post={post} now={now} />)}
                    </div>
                </section>
            ) : null}

            <PublicFooter branches={branches} />
        </main>
    );
}
